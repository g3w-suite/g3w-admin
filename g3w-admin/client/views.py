from django.views.generic import TemplateView
from django.shortcuts import get_object_or_404
from django.http import Http404, HttpResponseForbidden
from django.conf import settings
from rest_framework.renderers import JSONRenderer
from core.api.serializers import GroupSerializer, Group
from django.contrib.auth.views import redirect_to_login
from django.apps import apps
from django.core.exceptions import PermissionDenied
from copy import deepcopy


class ClientView(TemplateView):

    template_name = "client/index.html"

    def dispatch(self, request, *args, **kwargs):

        # che permissions
        Project = apps.get_app_config(kwargs['project_type']).get_model('project')
        if not request.user.has_perm("{}.view_project".format(kwargs['project_type']),
                                     Project.objects.get(pk=kwargs['project_id'])):

            # redirect to login if Anonymous user
            if request.user.is_anonymous():
                return redirect_to_login(request.get_full_path(), settings.LOGIN_URL, 'next')
            else:
                raise PermissionDenied()
        return super(ClientView, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        contextData = super(ClientView,self).get_context_data(**kwargs)

        # group serializer
        group = get_object_or_404(Group, slug=kwargs['group_slug'])
        groupSerializer = GroupSerializer(group,projectId=kwargs['project_id'], projectType=kwargs['project_type'])

        groupData = deepcopy(groupSerializer.data)

        # add user login data
        u = self.request.user
        if not u.is_anonymous():
            groupData['user'] = {
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'groups': [g.name for g in u.groups.all()]
            }

        # add baseUrl property
        contextData['group_config'] = 'var initConfig ={{ "staticurl":"{}","group":{} }}'.format(settings.STATIC_URL+"g3w-client/",JSONRenderer().render(groupData))

        # project by type(app)
        if not '{}-{}'.format(kwargs['project_type'],kwargs['project_id']) in groupSerializer.projects.keys():
            raise Http404('No project type and/or project id present in group')

        # page title
        # todo: set page title by project name??
        contextData['page_title'] = 'g3w-client'

        return contextData




