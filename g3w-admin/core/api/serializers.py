from django.conf import settings
from django.apps import apps
from django.urls import reverse
from django.contrib.gis.geos import GEOSGeometry, GEOSException
from django.contrib.gis.gdal import GDALException
from django.core.exceptions import ValidationError
from guardian.shortcuts import get_objects_for_user, get_user_model
from rest_framework import serializers
from rest_framework.fields import empty
from core.models import Group, BaseLayer
from core.signals import initconfig_plugin_start
from core.mixins.api.serializers import G3WRequestSerializer
from core.utils.geo import get_crs_bbox

from qgis.core import QgsCoordinateReferenceSystem, QgsCoordinateTransform, QgsCoordinateTransformContext
from copy import copy
import json


def update_serializer_data(serializer_data, data):
    """
    update layerserializer data by type: update or append
    """
    # switch for operation_type:
    if data['operation_type'] == 'update':
        to_update = serializer_data[data['update_path']] if 'update_path' in data else serializer_data
        to_update.update(data['values'])
    elif data['operation_type'] == 'replace':
        serializer_data[data['replace_path']] = data['values']
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
        model = BaseLayer
        fields = (
            'id',
            'name',
            'title',
            'icon'
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
        # before check macrogroups and groups number also if is equal to 1 use it

        try:
            macrogroup = instance.macrogroups.get(use_logo_client=True)
            ret['header_logo_img'] = macrogroup.logo_img.name
        except:
            ret['header_logo_img'] = instance.header_logo_img.name

        try:
            macrogroup = instance.macrogroups.get(use_title_client=True)
            ret['title'] = macrogroup.title
        except:
            pass

        # add crs:
        crs = QgsCoordinateReferenceSystem(f'EPSG:{self.instance.srid.srid}')

        # Patch for Proj4 > 4.9.3 version
        if self.instance.srid.srid in settings.G3W_PROJ4_EPSG.keys():
            proj4 = settings.G3W_PROJ4_EPSG[self.instance.srid.srid]['proj4']
            extent = settings.G3W_PROJ4_EPSG[self.instance.srid.srid]['extent']

        else:
            proj4 = crs.toProj4()
            if crs.postgisSrid() in (4326, 3857):
                extent = get_crs_bbox(crs)
            else:
                extent = [0,0,8388608,8388608]

        ret['crs'] = {
            'epsg': crs.postgisSrid(),
            'proj4': proj4,
            'geographic': crs.isGeographic(),
            'axisinverted': crs.hasAxisInverted(),
            'extent': extent
        }

        # add projects to group
        ret['projects'] = []
        self.projects = {}

        anonymous_user = get_user_model().get_anonymous()

        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            projects = get_objects_for_user(self.request.user, '{}.view_project'.format(g3wProjectApp), Project) \
                .filter(group=instance, is_active=True)
            projects_anonymous = get_objects_for_user(anonymous_user, '{}.view_project'.format(g3wProjectApp),
                                                      Project).filter(group=instance, is_active=True)
            projects = list(set(projects) | set(projects_anonymous))

            for project in projects:
                self.projects[g3wProjectApp+'-'+str(project.id)] = project

                if project.pk == int(self.projectId) and g3wProjectApp == self.projectType:
                    self.project = project

                # project thumbnail
                thumbnail = project.thumbnail
                try:
                    if project.group.use_logo_client:
                        thumbnail = project.group.header_logo_img
                    else:
                        macrogroup = project.group.macrogroups.get(
                            use_logo_client=True)
                        thumbnail = macrogroup.logo_img
                except:
                    pass

                project_thumb = thumbnail.name if bool(thumbnail.name) \
                    else '{}client/images/FakeProjectThumb.png'.format(settings.STATIC_URL)

                # Get project url
                if project.url_alias:
                    url = reverse('group-project-map-alias', args=[project.url_alias])[1:]
                else:
                    url = reverse('group-project-map', args=[project.group.slug, g3wProjectApp, project.pk])[1:]

                ret['projects'].append({
                    'id': project.id,
                    'title': project.title,
                    'description': project.description,
                    'thumbnail': project_thumb,
                    'type': g3wProjectApp,
                    'gid': "{}:{}".format(g3wProjectApp, project.id),
                    'modified': project.modified.timestamp() if hasattr(project, 'modified') else 0,
                    'url': url
                })

        # baselayers
        ret['baselayers'] = []
        baselayers = instance.baselayers.all().order_by('order')
        for baselayer in baselayers:
            ret['baselayers'].append(BaseLayerSerializer(baselayer).data)

        # add vendorkeys if it is set into settings
        if settings.VENDOR_KEYS:
            ret['vendorkeys'] = settings.VENDOR_KEYS

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

        # Plugins/Module data
        # Data from plugins can be instance of dict or list
        # - dict results are used only for update 'plugins' API return data
        # - list results are more verbose and action on 'plugins' API section is declared, ie:
        # {
        #     'mode': 'delete',
        #     'data': [<list_plugins_section_to_remove>]
        #  },
        # {
        #     'mode': 'update',
        #     'data': {
        #         '<lugins_name>: {
        #             ...
        #         }
        #     }
        # }

        plugins = initconfig_plugin_start.send(sender=self, project=self.projectId, projectType=self.projectType)
        for data_plugin in plugins:
            if data_plugin[1] and isinstance(data_plugin[1], dict):
                ret['plugins'] = copy(ret['plugins'])
                ret['plugins'].update(data_plugin[1])
            elif data_plugin[1] and isinstance(data_plugin[1], list):
                for dp in data_plugin[1]:
                    if dp['mode'] == 'delete':
                        ret['plugins'] = copy(ret['plugins'])
                        for k in dp['data']:
                            try:
                                ret['plugins'].pop(k)
                            except:
                                pass
                    elif dp['mode'] == 'update':
                        ret['plugins'] = copy(ret['plugins'])
                        ret['plugins'].update(dp['data'])


        # powerd_by
        ret['powered_by'] = settings.G3WSUITE_POWERD_BY

        # header customs links
        header_custom_links = getattr(settings, 'G3W_CLIENT_HEADER_CUSTOM_LINKS', None)
        ret['header_custom_links'] = []
        if header_custom_links:

            # check for possible callback
            for head_link in header_custom_links:
                if callable(head_link):
                    ret['header_custom_links'].append(head_link(self.request))
                else:
                    ret['header_custom_links'].append(head_link)

        # custom layout
        ret['layout'] = {}

        # add legend settings if set to layout
        layout_legend = getattr(settings, 'G3W_CLIENT_LEGEND', None)
        if layout_legend:
            ret['layout']['legend'] = layout_legend

        # Check if G3W_CLIENT_LEGEND['layertitle'] set it tu false
        if self.project.legend_position == 'toc':
            if layout_legend:
                ret['layout']['legend']['layertitle'] = False
            else:
                ret['layout']['legend'] = {'layertitle': False}

        # add legend settings if set to layout
        layout_right_panel = getattr(settings, 'G3W_CLIENT_RIGHT_PANEL', None)
        if layout_right_panel:
            ret['layout']['rightpanel'] = layout_right_panel

        # Mapcontrols
        ret['mapcontrols'] = {}
        for mapcontrol in instance.mapcontrols.all():
            options = {}
            if mapcontrol.name in ('nominatim', 'geocoding'):
                options = {'providers': {}}
                if self.project.geocoding_providers:
                    for gp in json.loads(self.project.geocoding_providers):
                        if gp in settings.GEOCODING_PROVIDERS:
                            options['providers'].update({
                                gp: settings.GEOCODING_PROVIDERS[gp]
                            })
                    if "qes" in settings.INSTALLED_APPS and mapcontrol.name == 'geocoding':

                        qes = {}
                        
                        # Check for settings
                        if hasattr(settings, 'QES_RESULTS_OPTIONS'):
                            qes.update(settings.QES_RESULTS_OPTIONS)
                            
                        options['providers'].update({
                            'qes': qes
                        })


            ret['mapcontrols'].update({
                mapcontrol.name: options
            })

        # Macrogroups
        ret['macrogroup_id'] = [macrogroup.id for macrogroup in instance.macrogroups.all()]

        return ret

    class Meta:
        model = Group
        fields = (
            'id',
            'name',
            'title',
            'slug',
            'minscale',
            'maxscale',
            'crs',
            'background_color',
            'header_logo_link',
            'header_terms_of_use_text',
            'header_terms_of_use_link'
        )


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

        if 'exclude' in kwargs:
            self.Meta.exclude = kwargs['exclude']
            del (kwargs['exclude'])

    def _get_meta_using(self):
        return self.Meta.using if hasattr(self.Meta, 'using') else None

    def create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        instance.save(using=self._get_meta_using())
        return instance

    def update(self, instance, validated_data):
        using = self.Meta.using if hasattr(self.Meta, 'using') else None
        for field, value in list(validated_data.items()):
            setattr(instance, field, value)
        instance.save(using=self._get_meta_using())
        return instance

    @classmethod
    def delete(cls, instance):
        """
        Classmethod to delete model instance
        """
        instance.delete()