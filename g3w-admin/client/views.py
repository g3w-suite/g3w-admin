from django.views.generic import TemplateView
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.apps import apps
from core.api.serializers import GroupSerializer, Group


class ClientView(TemplateView):

    template_name = "client/index.html"

    def get_context_data(self, **kwargs):
        contextData = super(ClientView,self).get_context_data(**kwargs)

        # group serializer
        group = get_object_or_404(Group, slug=kwargs['group_slug'])
        groupSerializer = GroupSerializer(group)
        contextData['group_config'] = 'var config = {}'.format(groupSerializer.data)

        # project by type(app)
        if not '{}-{}'.format(kwargs['project_type'],kwargs['project_id']) in groupSerializer.projects.keys():
            raise Http404('No project type and/or project id present in group')

        # page title
        # todo: set page title by project name??
        contextData['page_title'] = 'g3w-client'

        return contextData




