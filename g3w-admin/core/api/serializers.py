from django.conf import settings
from django.apps import apps
from rest_framework import serializers
from rest_framework.fields import empty
from core.models import Group


class GroupSerializer(serializers.ModelSerializer):

    minscale = serializers.IntegerField(source='min_scale', read_only=True)
    maxscale = serializers.IntegerField(source='max_scale', read_only=True)
    crs = serializers.IntegerField(source='srid', read_only=True)

    def __init__(self,instance=None, data=empty, **kwargs):
        self.projectId = kwargs['projectId']
        del(kwargs['projectId'])
        super(GroupSerializer, self).__init__(instance, data, **kwargs)

    def to_representation(self, instance):
        ret = super(GroupSerializer, self).to_representation(instance)

        # add projects to group
        ret['projects'] = []
        self.projects = {}

        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            projects = Project.objects.all()
            for project in projects:
                self.projects[g3wProjectApp+'-'+str(project.id)] = project
                ret['projects'].append({
                    'id': project.id,
                    'title': project.title,
                    'type': g3wProjectApp
                })

        # add baselayers
        ret['baseLayers'] = []

        # add initproject and overviewproject
        ret['initproject'] = int(self.projectId)

        # todo: set project id for overviewmap
        ret['overviewproject'] = None

        return ret

    class Meta:
        model= Group
        fields = (
            'id',
            'name',
            'minscale',
            'maxscale',
            'crs'
        )

