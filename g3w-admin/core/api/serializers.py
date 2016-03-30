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
        self.projectType = kwargs['projectType']
        del(kwargs['projectId'])
        del(kwargs['projectType'])
        super(GroupSerializer, self).__init__(instance, data, **kwargs)

    def to_representation(self, instance):
        ret = super(GroupSerializer, self).to_representation(instance)

        # add projects to group
        ret['projects'] = []
        self.projects = {}

        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            projects = Project.objects.filter(group=instance)
            for project in projects:
                self.projects[g3wProjectApp+'-'+str(project.id)] = project
                ret['projects'].append({
                    'id': project.id,
                    'title': project.title,
                    'type': g3wProjectApp,
                    'gid': "{}:{}".format(g3wProjectApp, project.id)
                })

        # add baselayers
        ret['baselayers'] = []

        # add initproject and overviewproject
        ret['initproject'] = "{}:{}".format(self.projectType,self.projectId)

        # add overviewproject is present
        overviewproject = instance.project_panoramic.all()
        if overviewproject:
            overviewproject = overviewproject[0]
            ret['overviewproject'] = {
                'id': int(overviewproject.project_id),
                'type': overviewproject.project_type,
                'gid': "{}:{}".format(overviewproject.project_type,overviewproject.project_id)
            }
        else:
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

