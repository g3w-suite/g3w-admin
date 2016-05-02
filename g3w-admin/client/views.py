from django.views.generic import TemplateView
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.conf import settings
from rest_framework.renderers import JSONRenderer
from core.api.serializers import GroupSerializer, Group
from django.contrib.auth.models import User
from copy import deepcopy

class ClientView(TemplateView):

    template_name = "client/index.html"

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




