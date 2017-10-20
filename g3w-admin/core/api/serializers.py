from django.conf import settings
from django.apps import apps
from django.contrib.gis.geos import GEOSGeometry, GEOSException
from django.contrib.gis.gdal import OGRException
from django.core.exceptions import ValidationError
from guardian.shortcuts import get_objects_for_user, get_user_model
from rest_framework import serializers
from rest_framework.fields import empty
from rest_framework_gis.fields import GeometryField
from shapely import wkt, geometry
from core.models import Group
from core.signals import initconfig_plugin_start
from core.mixins.api.serializers import G3WRequestSerializer
from copy import copy


def update_serializer_data(serializer_data, data):
    """
    update layerserializer data by type: update or append
    """
    # switch for operation_type:
    if data['operation_type'] == 'update':
        to_update = serializer_data[data['update_path']] if 'update_path' in data else serializer_data
        to_update.update(data['values'])
    elif data['operation_type'] == 'append':
        if 'append_path' in data:
            if isinstance(data['append_path'], list):
                to_append = None
                for step in data['append_path']:
                    if not to_append:
                        to_append = serializer_data[step]
                    else:
                        to_append = to_append[step]
            else:
                to_append = serializer_data[data['append_path']]
            for value in data['values']:
                to_append.append(value)


class BaseLayerSerializer(serializers.ModelSerializer):
    """
    Serializer Class base for layer project
    """
    def to_representation(self, instance):
        ret = super(BaseLayerSerializer, self).to_representation(instance)
        ret.update(eval(instance.property))
        return ret

    class Meta:
        model = Group
        fields = (
            'id',
            'name',
            'title',
        )


class GroupSerializer(G3WRequestSerializer, serializers.ModelSerializer):
    """
    Serializer for Project Group
    """
    minscale = serializers.IntegerField(source='min_scale', read_only=True)
    maxscale = serializers.IntegerField(source='max_scale', read_only=True)
    crs = serializers.IntegerField(read_only=True)

    def __init__(self, instance=None, data=empty, **kwargs):
        self.projectId = kwargs['projectId']
        self.projectType = kwargs['projectType']
        del(kwargs['projectId'])
        del(kwargs['projectType'])
        super(GroupSerializer, self).__init__(instance, data, **kwargs)

    def to_representation(self, instance):
        ret = super(GroupSerializer, self).to_representation(instance)

        # add header_logo
        ret['header_logo_img'] = instance.header_logo_img.name

        # add crs:
        ret['crs'] = int(str(self.instance.srid.srid))
        ret['proj4'] = self.instance.srid.proj4text

        # map controls
        ret['mapcontrols'] = [mapcontrol.name for mapcontrol in instance.mapcontrols.all()]

        # add projects to group
        ret['projects'] = []
        self.projects = {}

        anonymous_user = get_user_model().get_anonymous()

        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            projects = get_objects_for_user(self.request.user, '{}.view_project'.format(g3wProjectApp), Project) \
                .filter(group=instance)
            projects_anonymous = get_objects_for_user(anonymous_user, '{}.view_project'.format(g3wProjectApp),
                                                      Project).filter(group=instance)
            projects = list(set(projects) | set(projects_anonymous))
            for project in projects:
                self.projects[g3wProjectApp+'-'+str(project.id)] = project

                # project thumbnail
                project_thumb = project.thumbnail.name if bool(project.thumbnail.name) \
                    else '{}g3w-client/images/FakeProjectThumb.png'.format(settings.STATIC_URL)
                ret['projects'].append({
                    'id': project.id,
                    'title': project.title,
                    'description': project.description,
                    'thumbnail': project_thumb  ,
                    'type': g3wProjectApp,
                    'gid': "{}:{}".format(g3wProjectApp, project.id)
                })

        # baselayers
        ret['baselayers'] = []
        baselayers = instance.baselayers.all()
        for baselayer in baselayers:
            ret['baselayers'].append(BaseLayerSerializer(baselayer).data)


        # add initproject and overviewproject
        ret['initproject'] = "{}:{}".format(self.projectType, self.projectId)

        # add overviewproject is present
        overviewproject = instance.project_panoramic.all()
        if overviewproject:
            overviewproject = overviewproject[0]
            ret['overviewproject'] = {
                'id': int(overviewproject.project_id),
                'type': overviewproject.project_type,
                'gid': "{}:{}".format(overviewproject.project_type, overviewproject.project_id)
            }
        else:
            ret['overviewproject'] = None

        ret['plugins'] = {}

        # plugins/module data
        dataPlugins = initconfig_plugin_start.send(sender=self, project=self.projectId, projectType=self.projectType)
        for dataPlugin in dataPlugins:
            if dataPlugin[1]:
                ret['plugins'] = copy(ret['plugins'])
                ret['plugins'].update(dataPlugin[1])
        return ret

    class Meta:
        model = Group
        fields = (
            'id',
            'name',
            'minscale',
            'maxscale',
            'crs',
            'background_color',
            'header_logo_link',
            'header_terms_of_use_text',
            'header_terms_of_use_link'
        )


class G3WGeometryField(GeometryField):
    """
    A field to handle GeoDjango Geometry fields
    """

    def to_internal_value(self, value):
        if value == '' or value is None:
            return value
        if isinstance(value, GEOSGeometry):
            # value already has the correct representation
            return value
        if isinstance(value, dict):
            value = wkt.dumps(geometry.shape(value))
        try:
            return GEOSGeometry(value)
        except (ValueError, GEOSException, OGRException, TypeError):
            raise ValidationError(_('Invalid format: string or unicode input unrecognized as GeoJSON, WKT EWKT or HEXEWKB.'))


class G3WSerializerMixin(object):
    """
    Generic mixins for serializer model
    """

    relationsAttributes = None
    using_db = None

    def set_meta(self, kwargs):
        """
        Set meta properties for dinamical model
        :param kwargs: ditc params
        """
        self.Meta = self.Meta()
        self.Meta.model = kwargs['model']
        del (kwargs['model'])
        self.Meta.using = kwargs['using']
        del (kwargs['using'])

    def _get_meta_using(self):
        return self.Meta.using if hasattr(self.Meta, 'using') else None

    def create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        instance.save(using=self._get_meta_using())
        return instance

    def update(self, instance, validated_data):
        using = self.Meta.using if hasattr(self.Meta, 'using') else None
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save(using=self._get_meta_using())
        return instance

    @classmethod
    def delete(cls, instance):
        """
        Classmethod to delete model instance
        """
        instance.delete()