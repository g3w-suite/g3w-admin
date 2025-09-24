import logging
import os
import time

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import UniqueConstraint
from ordered_model.models import OrderedModel
from core.configs import *
from core.mixins.models import G3WACLModelMixins, G3WProjectMixins
from core.models import (BaseLayer, Group, GroupProjectPanoramic,
                         ProjectMapUrlAlias)
from core.fields import AutoSlugField
from core.receivers import check_overviewmap_project
from core.utils import unicode2ascii
from core.utils.slugify import slugify
from django.conf import settings
from django.contrib.auth.models import Group as AuthGroup
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_delete
from django.utils.translation import gettext_lazy as _
from django.core.cache import cache
from guardian.shortcuts import get_perms
from guardian.utils import get_anonymous_user
from model_utils import Choices
from model_utils.models import TimeStampedModel
from qdjango.utils.models import get_constraints4layer, get_widgets4layer
from qdjango.utils.storage import QgisFileOverwriteStorage
from qdjango.utils.qgis import get_aliases
from qgis.core import QgsMapLayerStyle, QgsRectangle, QgsVectorLayer
from qgis.PyQt.QtXml import QDomDocument
from usersmanage.configs import *
from usersmanage.utils import (
    get_groups_for_object,
    get_users_for_object,
    getUserGroups,
    setPermissionUserObject,
)

import json

logger = logging.getLogger(__name__)

# Layer type with widget set capability
TYPE_LAYER_FOR_WIDGET = (
    'postgres',
    'spatialite',
    'ogr',
    'mssql',
    'virtual',
    'oracle',
)

# Layer type with download capability
TYPE_LAYER_FOR_DOWNLOAD = (
    'postgres',
    'spatialite',
    'ogr',
    'mssql',
    'virtual',
    'oracle',
)

TYPE_RASTER_LAYER_FOR_DOWNLOAD = (
    'gdal',
    'raster',
)


def buildLayerTreeNodeObject(layerTreeNode):
    """Creates a dictionary that represents the QGIS Project layer tree

    :param layerTreeNode: QGIS layer tree node (usually from QgsProject.layerTreeRoot())
    :type layerTreeNode: QgsLayerTreeNode
    :return: the project's layer tree
    :rtype: dict
    """

    toRetLayers = []
    for node in layerTreeNode.children():

        toRetLayer = {
            'name': node.name(),
            'expanded': node.isExpanded()
        }

        try:
            # try for layer node
            toRetLayer.update({
                'id': node.layerId(),
                'visible': node.itemVisibilityChecked()
            })

            # Add `showFeatureCount` custom property per Vector layer only
            if 'showFeatureCount' in node.customProperties() and node.customProperty('showFeatureCount') == 1:
                toRetLayer.update({
                    'showfeaturecount': True
                })

        except:

            toRetLayer.update({
                'mutually-exclusive': node.isMutuallyExclusive(),
                'nodes': buildLayerTreeNodeObject(node),
                'checked': node.itemVisibilityChecked(),

            })

        toRetLayers.append(toRetLayer)

    return toRetLayers


def get_project_file_path(instance, filename):
    """Custom name for uploaded project files."""

    group_name = slugify(str(instance.group.name))
    project_name = slugify(str(instance.title))
    filename = '{}_{}.qgs'.format(group_name, project_name)
    return os.path.join('projects', filename)


def get_thumbnail_path(instance, filename):
    """Custom name for uploaded thumbnails."""
    group_name = slugify(str(instance.group.name))
    project_name = slugify(str(instance.title))
    ext = filename.split('.')[-1]
    filename = '{}_{}.{}'.format(group_name, project_name, ext)
    return os.path.join('thumbnails', filename)


class QgisProjectFileLocker():
    """Mutex to prevent multiple processes to write the same project concurrently"""

    def __init__(self, project):
        self.project = project
        timeout = 10
        timer = 0
        while Project.objects.get(pk=self.project.pk).is_locked:
            time.sleep(0.1)
            timer += 1
            if timer > timeout:
                raise Exception('QGIS Project is locked! Cannot write.')

        self.project.is_locked = True
        self.project.save()

    def __enter__(self):
        return self.project

    def __exit__(self, type, value, traceback):
        self.project = Project.objects.get(pk=self.project.pk)
        self.project.is_locked = False
        self.project.save()


class Project(G3WProjectMixins, G3WACLModelMixins, TimeStampedModel):
    """A QGIS project."""

    QUERY_TYPE = Choices(
        ('single', _('Single')),
        ('multiple', _('Multiple'))
    )

    CLIENT_TOC_TABS = Choices(
        ('layers', _('Layers')),
        ('baselayers', _('Base layers')),
        ('legend', _('Legend'))
    )

    CLIENT_TOC_LAYERS_INIT_STATUS = Choices(
        ('collapsed', _('Collapsed')),
        ('not_collapsed', _('Not collapsed'))
    )

    CLIENT_MAP_THEMES_INIT_STATUS = Choices(
        ('collapsed', _('Collapsed')),
        ('not_collapsed', _('Not collapsed'))
    )

    CLIENT_LEGEND_POSITION = Choices(
        ('tab', _('In a separate TAB')), ('toc', _('Into TOC layers'))
    )
    WMS_GETMAP_FORMAT = Choices(
        ('image/png; mode=1bit', _('PNG 1bit')),
        ('image/png; mode=8bit', _('PNG 8bit')),
        ('image/png; mode=16bit', _('PNG 16bit')),
        ('image/png', _('PNG')),
        ('image/jpeg', _('JPEG')),
        ('image/webp', _('WEBP')),
    )

    # Project file
    qgis_file = models.FileField(
        _('QGIS project file'),
        max_length=400,
        upload_to=get_project_file_path,
        storage=QgisFileOverwriteStorage(),
    )

    # General info
    title = models.CharField(
        _('Title'),
        max_length=255,
    )

    title_ur = models.CharField(
        _('Public title'),
        max_length=255,
        null=True,
        blank=True,
    )

    description = models.TextField(
        _('Description'),
        blank=True,
        null=True,
    )

    slug = AutoSlugField(
        _('Slug'),
        populate_from=['title'],
        unique=True,
    )

    is_active = models.BooleanField(_('Is active'), default=1)

    # Thumbnail
    thumbnail = models.ImageField(_('Thumbnail'), blank=True, null=True)

    # Group
    group = models.ForeignKey(
        Group,
        related_name='qdjango_project',
        verbose_name=_('Group'),
        on_delete=models.CASCADE,
    )

    # Extent
    initial_extent = models.CharField(
        _('Initial extent'),
        max_length=255,
    )

    max_extent = models.CharField(
        _('Max extent'),
        max_length=255,
        null=True,
        blank=True,
    )

    # Qgis version project
    qgis_version = models.CharField(
        _('Qgis project version'),
        max_length=255,
        default='',
    )

    # LayersTree project structure
    layers_tree = models.TextField(
        _('Layers tree structure'),
        blank=True,
        null=True,
    )

    # BaseLayer
    baselayer = models.ForeignKey(
        BaseLayer,
        verbose_name=_('Base Layer'),
        related_name='qdjango_project_baselayer',
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
    )

    # possible layer relations
    relations = models.TextField(
        _('Layer relations'),
        blank=True,
        null=True,
    )

    # WMSUseLayerIDs
    wms_use_layer_ids = models.BooleanField(
        _('WMS use layer ids'), default=False)

    original_name = models.CharField(
        _('Qgis project original name'),
        max_length=256,
        default='',
        editable=False,
    )

    # client options:
    # ============================================

    feature_count_wms = models.IntegerField(
        _('Max feature to get for query'), default=5
    )

    multilayer_query = models.CharField(
        _('Query control mode'),
        max_length=20,
        choices=QUERY_TYPE,
        default='multiple',
    )

    multilayer_querybybbox = models.CharField(
        _('Query by bbox control mode'),
        max_length=20,
        choices=QUERY_TYPE,
        default='multiple',
    )

    multilayer_querybypolygon = models.CharField(
        _('Query by polygon control mode'),
        max_length=20,
        choices=QUERY_TYPE,
        default='multiple',
    )

    context_base_legend = models.BooleanField(
        _('Context base legend'),
        default=False,
        help_text=_(
            'Show only the symbols for the features falling into the requested area'
        ),
    )

    toc_tab_default = models.CharField(
        _("Tab's TOC active as default"),
        choices=CLIENT_TOC_TABS,
        max_length=40,
        default='layers',
        help_text=_("Set tab's TOC open by default on init client"),
    )

    toc_layers_init_status = models.CharField(
        _("Tab's TOC layer initial status"),
        choices=CLIENT_TOC_LAYERS_INIT_STATUS,
        max_length=40,
        default='not_collapsed',
        help_text=_(
            "Set tab's TOC layers initials state: 'Collapsed (close)' or 'Not collapsed (open)'"
        ),
    )

    toc_themes_init_status = models.CharField(
        _("Map themes list initial status"),
        choices=CLIENT_MAP_THEMES_INIT_STATUS,
        max_length=40,
        default='collapsed',
        help_text=_(
            "Set map themes list initials state: 'Collapsed (close)' or 'Not collapsed (open)'"
        ),
    )

    legend_position = models.CharField(
        _("Legend position rendering"),
        choices=CLIENT_LEGEND_POSITION,
        max_length=20,
        default='tab',
        help_text=_("Set legend position rendering"),
    )

    autozoom_query = models.BooleanField(
        _('Automatic zoom to query result features'),
        default=False,
        help_text=_('Automatic zoom on query result features for only one layer'),
    )

    show_metadata_section = models.BooleanField(
        _("Show the 'Metadata' section on left bar"),
        default=True,
        help_text=_("It is possible choose if show or hide the 'Metadata' section on left bar"),
    )

    sidebar_collapse = models.BooleanField(
        _('Start left sidebar collapsed'), 
        default=False, 
        help_text=_('Choose if the left sidebar is collapsed on start of webgis'))

    layouts = models.TextField(
        _('Project layouts'),
        null=True,
        blank=True,
    )

    use_map_extent_as_init_extent = models.BooleanField(
        _('Use QGIS project map start extent as webgis init extent'),
        default=False,
    )

    is_dirty = models.BooleanField(
        _(
            'The project has been modified by the G3W-Suite application after it was uploaded.'
        ),
        editable=False,
        default=False,
    )

    is_locked = models.BooleanField(
        _(
            'Mutex to lock the project when it is being written by the G3W-Suite application. This field is used internally by the suite through a context manager'
        ),
        editable=False,
        default=False,
    )

    order = models.PositiveIntegerField(
        _('Fields to se order'),
        default=0,
        blank=True,
        null=True,
    )

    wms_getmap_format = models.CharField(
        _('WMS GetMap image format'),
        default='image/png; mode=8bit',
        max_length=255,
        null=True,
        choices=WMS_GETMAP_FORMAT,
    )
    geocoding_providers = models.TextField(_('Geocoding providers'), blank=True, null=True)

    class Meta:
        verbose_name = _('Project')
        verbose_name_plural = _('Projects')
        unique_together = ('title', 'group')

    def __str__(self):
        return self.title

    @property
    def messages(self):
        """Returns the message queryset corresponding to this Project, or empty queryset"""
        return self.message_set.all()

    @property
    def qgis_project(self):
        """Returns the QgsProject instance corresponding to this Project, or None in case of errors

        :return: the QgsProject instance
        :rtype: QgsProject or None
        """

        from qdjango.apps import get_qgs_project

        return get_qgs_project(self.qgis_file.path)

    def update_qgis_project(self):
        """Updates the QGIS project associated with the G3W-Suite project instance and sets the "dirty" flag.

        WARNING: to prevent concurrent writes to the same project from different
        processes use QgisProjectFileLocker mutex.

        :return: True on success
        :rtype: bool
        """

        if self.qgis_project.write():
            self.is_dirty = True
            # Update layers tree
            self.layers_tree = str(
                buildLayerTreeNodeObject(self.qgis_project.layerTreeRoot())
            )
            self.save()
            return True
        else:
            return False

    def _permissionsToEditor(self, user, mode='add'):
        setPermissionUserObject(
            user,
            self,
            permissions=['change_project', 'delete_project', 'view_project'],
            mode=mode,
        )

        # if editor not has permission on group give permission only view on parent group
        if not user.has_perm('core.view_group', self.group):
            setPermissionUserObject(
                user,
                self.group,
                permissions=['core.view_group'],
                mode=mode,
            )

        layerAction = (
            'addPermissionsToEditor' if mode == 'add' else 'removePermissionsToEditor'
        )
        layers = self.layer_set.all()
        for layer in layers:
            getattr(layer, layerAction)(user)

    def _permissionsToViewers(self, users_id, mode='add'):
        for user_id in users_id:
            user = User.objects.get(pk=user_id)

            setPermissionUserObject(user, self, permissions='view_project', mode=mode)

            layerAction = (
                'addPermissionsToViewers'
                if mode == 'add'
                else 'removePermissionsToViewers'
            )

            layers = self.layer_set.all()
            for layer in layers:
                getattr(layer, layerAction)(users_id)

    def _permissions_to_user_groups_editor(self, groups_id, mode='add'):
        for group_id in groups_id:
            auth_group = AuthGroup.objects.get(pk=group_id)

            setPermissionUserObject(
                auth_group,
                self,
                permissions=['change_project', 'delete_project', 'view_project'],
                mode=mode,
            )

            # if viewer not has permission on group give permission only view on parent group
            if 'view_group' not in get_perms(auth_group, self.group):
                setPermissionUserObject(
                    auth_group,
                    self.group,
                    permissions=['core.view_group'],
                    mode=mode,
                )

            layerAction = (
                'add_permissions_to_editor_user_groups'
                if mode == 'add'
                else 'remove_permissions_to_editor_user_groups'
            )

            layers = self.layer_set.all()

            for layer in layers:
                getattr(layer, layerAction)(groups_id)

    def _permissions_to_user_groups_viewer(self, groups_id, mode='add'):
        for group_id in groups_id:
            auth_group = AuthGroup.objects.get(pk=group_id)
            setPermissionUserObject(
                auth_group,
                self,
                permissions='view_project',
                mode=mode,
            )

            layerAction = (
                'add_permissions_to_viewer_user_groups'
                if mode == 'add'
                else 'remove_permissions_to_viewer_user_groups'
            )

            layers = self.layer_set.all()

            for layer in layers:
                getattr(layer, layerAction)(groups_id)

    def tree(self):
        def readLeaf(layer, layers):
            if 'nodes' in layer:
                children = []
                for node in layer['nodes']:
                    children.append(readLeaf(node, layers))

                return ['g_{}'.format(layer['name']), children]
            else:
                return [layers[layer['id']][0], layers[layer['id']][1]]

        layers = self.layer_set.values_list('id', 'name', 'qgs_layer_id')
        _layers = {l[2]: l for l in layers}

        layers_tree = []
        for l in eval(self.layers_tree):
            layers_tree.append(readLeaf(l, _layers))

        return layers_tree

    @property
    def url_alias(self):
        try:
            return ProjectMapUrlAlias.objects.get(
                app_name='qdjango',
                project_id=self.pk,
            ).alias
        except:
            return None

    @url_alias.setter
    def url_alias(self, url_alias):
        if url_alias:
            ProjectMapUrlAlias.objects.update_or_create(
                app_name='qdjango',
                project_id=self.pk,
                defaults={'alias': url_alias},
            )
        else:
            try:
                ProjectMapUrlAlias.objects.get(
                    app_name='qdjango',
                    project_id=self.pk,
                ).delete()
            except:
                pass

    def __getattr__(self, attr):
        if attr == 'viewers':
            return get_users_for_object(
                self, 'view_project', [G3W_VIEWER1, G3W_VIEWER2], with_anonymous=True
            )

        elif attr == 'editor':
            editors = get_users_for_object(self, 'change_project', [G3W_EDITOR1])
            if len(editors) > 0:
                return editors[0]
            else:
                return None

        elif attr == 'editor2':
            editors = get_users_for_object(self, 'change_project', [G3W_EDITOR2])
            if len(editors) > 0:
                return editors[0]
            else:
                return None

        # Get users groups
        # ================
        elif attr == 'editor_user_groups':
            return get_groups_for_object(self, 'change_project', 'editor')

        elif attr == 'viewer_user_groups':
            return get_groups_for_object(self, 'view_project', 'viewer')

        return super(Project, self).__getattribute__(attr)

    def invalidate_cache(self, user=None):
        """Method to invalidate(delete) API REST /api/config"""

        # Check if caching is activated
        if not settings.QDJANGO_PRJ_CACHE:
            return

        try:

            users = User.objects.all() if user == None else [user]

            # Invalidate project cache
            pre_keys = (
                f"{settings.QDJANGO_PRJ_CACHE_KEY}{self.group.slug}_{'qdjango'}_{self.pk}",
                f"{settings.QDJANGO_PRJ_CACHE_KEY}{self.group.pk}_{'qdjango'}_{self.pk}"
            )

            # Invalidate every cache for every user
            users = User.objects.all()
            for user in users:
                for pre_key in pre_keys:
                    d = cache.delete(f"{pre_key}_{str(user.pk)}")
                    if d:
                        logger.debug(
                            f"[CACHING /api/config]: Invalidate key {pre_key}_{str(user.pk)}"
                        )

        except Exception as e:
            logger.error(
                f"[CACHING /api/config] - An error on cache invalidation: {e}"
            )

    def get_scalevisibilitylayerconstraint(self, user, use_ids=True):
        """
        Return the ScaleVisibilityConstraint instance if exists for user for every layer
        Check also for groups of user
        """

        res = {}
        for l in self.layer_set.all():
            peruser = l.get_scalevisibilityconstraint(user)
            if peruser:
                if use_ids:
                    res[l.qgs_layer_id] = peruser
                else:
                    res[l.name] = peruser

        return res

post_delete.connect(check_overviewmap_project, sender=Project)


def get_layer_data_file_path(instance, filename):
    """Custom name for uploaded project files."""

    return settings.DATASOURCE_PATH


class VectorLayersManager(models.Manager):
    """Returns only vector layers"""

    def get_queryset(self):
        return super().get_queryset().exclude(layer_type__in=('gdal', 'wms', 'arcgismapserver', 'vector-tile'))


class Layer(G3WACLModelMixins, models.Model):
    """A QGIS layer."""

    TYPES = Choices(
        ('postgres', _('Postgres')),
        ('spatialite', _('SpatiaLite')),
        ('raster', _('Raster')),
        ('wfs', _('WFS')),
        ('wms', _('WMS')),
        ('ogr', _('OGR')),
        ('gdal', _('GDAL')),
        ('delimitedtext', _('CSV')),
        ('arcgismapserver', _('ArcGisMapServer')),
        ('arcgisfeatureserver', _('ArcGisFeatureServer')),
        ('mssql', _('MSSQL')),
        ('virtual', _('VirtualLayer')),
        ('oracle', _('Oracle')),
        ('vector-tile', _('Vector Tile')),
        ('wcs', _('WCS')),
        ('vectortile', _('Vector Tile')),
        ('mdal', _('Mesh layer')),
        ('postgresraster', _('PostGis raster'))
    )

    # General info
    name = models.CharField(
        _('Name'),
        max_length=1000,
    )

    title = models.CharField(
        _('Title'),
        max_length=255,
        blank=True,
    )
    origname = models.CharField(
        _('Original Name'),
        max_length=1000,
        null=True,
        blank=True,
    )

    qgs_layer_id = models.CharField(
        _('Qgis Layer Project ID'),
        max_length=1000,
        blank=True,
        null=True,
    )

    description = models.TextField(
        _('Description'),
        blank=True,
    )

    slug = AutoSlugField(
        _('Slug'),
        populate_from=['name'],
        unique=True,
        overwrite=True,
    )

    is_active = models.BooleanField(
        _('Is active'),
        default=1,
    )

    # Project
    project = models.ForeignKey(
        Project,
        verbose_name=_('Project'),
        on_delete=models.CASCADE,
    )

    parent_project = models.ForeignKey(
        Project,
        verbose_name=_('Parent Project for Embedded layers'),
        blank=True,
        null=True,
        on_delete=models.CASCADE,
        editable=False,
        related_name='parent_project',
    )

    # Type and content
    layer_type = models.CharField(
        _('Type'),
        choices=TYPES,
        max_length=255,
    )

    datasource = models.TextField(
        _('Datasource'),
    )

    is_visible = models.BooleanField(
        _('Is visible'),
        default=1,
    )

    order = models.IntegerField(
        _('Order'),
        default=1,
    )

    # Optional data file (non-postgres layers need it)
    data_file = models.FileField(
        _('Associated data file'),
        upload_to=get_layer_data_file_path,
        blank=True,
        null=True,
    )

    # TODO: make this a property of the Layer object
    # Database columns (DB layers need it)
    database_columns = models.TextField(
        _('Database columns'),
        blank=True,
        null=True,
    )

    # DEPRECATED: This property will be removed in version 4.0
    # It will be used max_scale_style
    min_scale = models.IntegerField(
        _('Layer Min Scale visibility'),
        blank=True,
        null=True,
    )

    min_scale_style = models.JSONField(
        _('Layer Max Scale visibility for layer styel'),
        blank=True,
        null=True,
    )

    # DEPRECATED: This property will be removed in version 4.0
    # It will be used max_scale_style
    max_scale = models.IntegerField(
        _('Layer Max Scale visibility'),
        blank=True,
        null=True,
    )

    max_scale_style = models.JSONField(
        _('Layer Max Scale visibility for layer styel'),
        blank=True,
        null=True,
    )

    scalebasedvisibility = models.BooleanField(
        _('Layer scale based visibility'),
        default=False,
    )

    scalebasedvisibility_style = models.JSONField(
        _('Scale based visibility for layer style'),
        blank=True,
        null=True,
    )

    # srid
    srid = models.IntegerField(
        _('Layer SRID'),
        blank=True,
        null=True,
    )

    # for capabilities and edit opsions
    capabilities = models.IntegerField(
        _('Bitwise capabilities'),
        blank=True,
        null=True,
    )

    edit_options = models.IntegerField(
        _('Bitwise edit options'),
        blank=True,
        null=True,
    )

    wfscapabilities = models.IntegerField(
        _('Bitwise wfs options'),
        blank=True,
        null=True,
    )

    # geometryType
    geometrytype = models.CharField(
        _('Geometry type'),
        max_length=255,
        blank=True,
        null=True,
    )

    exclude_attribute_wms = models.TextField(
        _('Attributes excluded from wms'),
        blank=True,
        null=True,
    )

    exclude_attribute_wfs = models.TextField(
        _('Attributes excluded from wfs'),
        blank=True,
        null=True,
    )

    # possible layer relations
    vectorjoins = models.TextField(
        _('Layer relations'),
        blank=True,
        null=True,
    )

    # editing widgets
    edittypes = models.TextField(
        _('Columns layer widgets'),
        blank=True,
        null=True,
    )

    # not show attributes table
    not_show_attributes_table = models.BooleanField(
        _('Not show attributes table'),
        default=False,
        blank=True,
    )

    # exclude from legend
    exclude_from_legend = models.BooleanField(
        _('Exclude to legend'),
        default=False,
        blank=True,
    )

    # exclude from toc
    exclude_from_toc = models.BooleanField(
        _('Exclude to TOC'),
        default=False,
        blank=True,
        null=True
    )

    # form editor layout
    editor_layout = models.CharField(
        _('Form editor layout'),
        max_length=100,
        blank=True,
        null=True,
    )

    editor_form_structure = models.TextField(
        _('Editor form structure'),
        blank=True,
        null=True,
    )

    download = models.BooleanField(
        _('Download data'),
        default=False,
        blank=True,
    )

    download_xls = models.BooleanField(
        _('Download data in xls format'),
        default=False,
        blank=True,
    )

    download_gpx = models.BooleanField(
        _('Download data in gpx format'),
        default=False,
        blank=True,
    )

    download_csv = models.BooleanField(
        _('Download data in csv format'),
        default=False,
        blank=True,
    )

    download_gpkg = models.BooleanField(
        _('Download data in gpkg format'),
        default=False,
        blank=True,
    )

    download_pdf = models.BooleanField(
        _('Download single attributes row in pdf format'),
        default=False,
        blank=True,
    )

    # layer extension
    extent = models.TextField(
        _('Layer extension'),
        null=True,
        blank=True,
    )

    # for layer WMS/WMST: set if load direct from their servers or from local QGIS-server
    external = models.BooleanField(
        _('Get WMS/WMS externally'),
        default=False,
        blank=True,
    )

    # For temporal properties
    temporal_properties = models.TextField(
        _('Temporal properties'),
        null=True,
        blank=True,
    )

    has_column_acl = models.BooleanField(
        _('Has column ACL constraints'),
        default=False,
        editable=False,
        db_index=True,
    )

    max_preview_fields = models.IntegerField(_('Number of fields to show in info result'), default=3,
                                                    blank=True, null=True)

    objects = models.Manager()  # The default manager.

    vectors = VectorLayersManager()

    @property
    def qgis_layer(self):
        """Returns the QgsMapLayer instance corresponding to this Layer, or None in case of errors

        :return: the QgsMapLayer instance
        :rtype: QgsVectorLayer or QgsRasterLayer
        """

        layer = None
        try:
            return self.project.qgis_project.mapLayers()[self.qgs_layer_id]
        except:
            logger.warning(
                'Cannot retrieve QgsMapLayer for QDjango layer %s' % self.qgs_layer_id
            )
            return layer

    @property
    def styles(self):
        """Returns the layer styles

        :return: list of dictionaries { name: '<style_name:str>', default: <bool> }
        :rtype: list
        """

        styles = []

        layer = self.qgis_layer
        if not layer is None:
            sm = layer.styleManager()
            for style in sm.styles():
                styles.append({'name': style, 'current': style == sm.currentStyle()})

        return styles

    @property
    def download_shp(self):
        """Alias for self.download"""

        return self.download

    def can_be_downloaded(self, with_pdf=False):
        """
        Returns True if the layer can be downloaded, and return also a list of the available formats

        :param with_pdf: if True, the pdf format is also checked
        :return: tuple (can_be_downloaded, list of formats)
        """

        formats = ['shp', 'gpx', 'csv', 'gpkg', 'xls']
        if with_pdf:
            formats.append('pdf')

        cbd = any([getattr(self, f"download_{f}") for f in formats])
        dfs = []

        # Create list of formats
        if cbd:
            for f in formats:
                if getattr(self, f"download_{f}"):
                    dfs.append(f)

        return cbd, dfs


    def visible_fields_for_user(self, user):
        """Returns a list of field names visible by the user
        according to ColumnAcl"""

        if isinstance(self.qgis_layer, QgsVectorLayer):
            attributes = self.qgis_layer.fields().names()

            if self.has_column_acl:
                if user.is_anonymous:
                    user = get_anonymous_user()

                for acl in self.columnacl_set.filter(models.Q(user=user) | models.Q(group__in=user.groups.all())):
                    attributes = list(set(attributes) -
                                      set(acl.restricted_fields))

            return attributes
        else:
            return []

    def is_embedded(self):
        """Returns true if the layer is embedded from another project"""

        return self.parent_project is not None

    def style(self, name):
        """Returns the style from name

        :param style: name of the style to return
        :type style: str
        :return: The requested style
        :rtype: QgsMapLayerStyle
        """

        layer = self.qgis_layer
        if layer is None:
            return QgsMapLayerStyle()

        sm = layer.styleManager()
        return sm.style(name)

    def styles_count(self):
        """Return number of styles"""

        return len(self.styles)

    def set_current_style(self, style):
        """Changes the current style

        :param style: name of the style to make current
        :type style: str
        :return: True on success
        :rtype: bool
        """

        with QgisProjectFileLocker(self.project) as project:
            layer = self.qgis_layer
            if layer is None:
                return False

            sm = layer.styleManager()
            result = sm.setCurrentStyle(style)

            if result:
                result = result and project.update_qgis_project()

        return result

    def rename_style(self, style, new_name):
        """Renames a style

        :param style: name of the style to rename
        :type style: str
        :param new_name: new name of the style
        :type new_name: str
        :return: True on success
        :rtype: bool
        """

        result = False

        with QgisProjectFileLocker(self.project) as project:
            layer = self.qgis_layer
            if layer is None:
                return False

            sm = layer.styleManager()

            if new_name in sm.styles():
                return False

            result = sm.renameStyle(style, new_name)

            if result:
                result = result and project.update_qgis_project()

        return result

    def replace_style(self, style, qml):
        """Replaces the style QML

        :param style: name of the style to replace
        :type style: str
        :param qml:
        :type qml: str
        :return: True on success
        :rtype: bool
        """

        result = False

        with QgisProjectFileLocker(self.project) as project:
            layer = self.qgis_layer
            if layer is None:
                return False

            sm = layer.styleManager()

            # Validate!
            doc = QDomDocument('qgis')
            if not doc.setContent(qml)[0]:
                return False

            tmp_layer = layer.clone()
            if not tmp_layer.importNamedStyle(doc)[0]:
                return False

            del(tmp_layer)

            # If the style is current, just replace it in the layer
            if sm.currentStyle() == style:
                return layer.importNamedStyle(doc)[0]
            else:
                new_style = QgsMapLayerStyle(qml)
                result = sm.addStyle(style, new_style)
                result = sm.removeStyle(
                    style) and sm.addStyle(style, new_style)

            if result:
                assert self.style(style).xmlData() == new_style.xmlData()
                result = result and project.update_qgis_project()

        return result

    def delete_style(self, style):
        """Deletes a style

        :param style: name of the style to delete
        :type style: str
        :return: True on success
        :rtype: bool
        """

        result = False

        with QgisProjectFileLocker(self.project) as project:
            layer = self.qgis_layer
            if layer is None:
                return False

            sm = layer.styleManager()
            result = sm.removeStyle(style)

            if result:
                result = result and project.update_qgis_project()

        return result

    def add_style(self, style, qml):
        """Deletes a style

        :param style: name of the new style
        :type style: str
        :param qml:
        :type qml: str
        :return: True on success
        :rtype: bool
        """

        layer = self.qgis_layer
        if layer is None:
            return False

        result = False

        with QgisProjectFileLocker(self.project) as project:
            sm = layer.styleManager()

            if sm.currentStyle() == style:
                return False

            # Validate!
            doc = QDomDocument('qgis')
            if not doc.setContent(qml)[0]:
                return False

            tmp_layer = layer.clone()
            if not tmp_layer.importNamedStyle(doc)[0]:
                return False

            del(tmp_layer)

            new_style = QgsMapLayerStyle(qml)
            result = sm.addStyle(style, new_style)

            if result:
                result = result and project.update_qgis_project()

        return result

    def has_value_relation_widget(self, field_name: str) -> bool:
        """
        Check if a field_name has a QGIS Form ValueRelation Widget
        """

        edittypes = self.get_edittypes()
        return edittypes[field_name]["widgetv2type"] == "ValueRelation"

    @property
    def extent_rect(self):
        """Return dict of coordinates extension string

        :rtype: str
        """

        rect = QgsRectangle().fromWkt(self.extent)
        return {
            'minx': rect.xMinimum(),
            'miny': rect.yMinimum(),
            'maxx': rect.xMaximum(),
            'maxy': rect.yMaximum(),
        }

    def get_edittypes(self, style=None):
        """
        Get edittypes for layer by style if style is not None
        """

        # If not set get the current qgis layer style
        if not style:
            style = self.qgis_layer.styleManager().currentStyle()

        et = eval(self.edittypes)
        try:
            return et[style]
        except KeyError:
            return et

    def get_editor_form_structure(self, style=None):
        """
        Get editor_from_struct for layer by style if style is not None
        """

        # If not set get the current qgis layer style
        if not style:
            style = self.qgis_layer.styleManager().currentStyle()


        if not self.editor_form_structure:
            return None
        
        # This patch the upgrade from 3.8.x to 3.10.x fro style mamagement
        efs = eval(self.editor_form_structure)
        if isinstance(efs, dict):
            return efs.get(style, None)
        else:
            return efs
        
    
    def get_fields_style(self, style=None):
        """
        Get database_columns for layer by style if style is not None
        """

        # If not set get the current qgis layer style
        if not style:
            style = self.qgis_layer.styleManager().currentStyle()

        aliases = get_aliases(self.qgis_layer)
        fields = eval(self.database_columns)
        for field in fields:
            if field['name'] in aliases[style]:
                field['label'] = aliases[style][field['name']]

        return fields
    
    def get_max_scale_style(self, style=None):
        """
        Get max_scale_style for layer by style if style is not None
        """

        # If not set get the current qgis layer style
        if not style:
            style = self.qgis_layer.styleManager().currentStyle()

        return self.max_scale_style.get(style, self.max_scale) if self.max_scale_style else self.max_scale
    
    def get_min_scale_style(self, style=None):
        """
        Get mix_scale_style for layer by style if style is not None
        """

        # If not set get the current qgis layer style
        if not style:
            style = self.qgis_layer.styleManager().currentStyle()

        return self.min_scale_style.get(style, self.min_scale) if self.min_scale_style else self.min_scale
    
    def get_scalebasedvisibility_style(self, style=None):
        """
        Get mix_scale_style for layer by style if style is not None
        """

        # If not set get the current qgis layer style
        if not style:
            style = self.qgis_layer.styleManager().currentStyle()

        return self.scalebasedvisibility_style.get(style, self.scalebasedvisibility) if self.scalebasedvisibility_style else self.scalebasedvisibility
        

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _('Layer')
        verbose_name_plural = _('Layers')
        unique_together = (('name', 'project', 'qgs_layer_id'),)
        ordering = ['order']
        permissions = (
            ('add_feature', 'Can add features to layer'),
            ('change_feature', 'Can update features geometry of layer'),
            ('delete_feature', 'Can delete features from layer'),
            ('change_attr_feature', 'Can update features attributes into layer'),
        )

    def database_columns_by_name(self, style=None):
        """
        Retrieves a dictionary mapping database column names to their definitions.

        :param style: The style to use for retrieving fields. If provided, uses
            get_fields_style(style) to get the fields for the specified style.
            If not provided, evaluates the database_columns attribute.
        :type style: str, optional

        :return: A dictionary where each key is a column name and each value is the corresponding
            column definition.
        :rtype: dict
        """

        if style:
            fields = self.get_fields_style(style)
        else:
            fields = eval(self.database_columns) if self.database_columns else None

        return {db_col['name']: db_col for db_col in fields}

    def getWidgetsNumber(self):
        """
        Count widgets for self layer
        :return: integer
        """

        return len(get_widgets4layer(self))

    def getConstraintsNumber(self):
        """
        Count constraints for self layer
        :return: integer
        """

        return len(get_constraints4layer(self))

    def get_scalevisibilityconstraint(self, user):
        """
        Return the ScaleVisibilityConstraint instance if exists for user
        Check also for groups of user
        """

        peruser = None

        try:
            if user.is_anonymous:
                user = get_anonymous_user()

            return self.scale_visibility_layer.get(user=user)

        except ObjectDoesNotExist:

            # Try with user's groups
            # Get viewer groups of user
            if not user.is_anonymous:
                groups = user.groups.exclude(name__in=[G3W_VIEWER1, G3W_VIEWER2])
                for g in groups:
                    try:
                        peruser = self.scale_visibility_layer.get(group=g)
                    except ObjectDoesNotExist:
                        pass

        return peruser


    def getColumnAclNumber(self):
        """
        Count ColumnAcl for self layer
        :return: integer
        """

        return self.columnacl_set.count() if self.has_column_acl else 0


    def getScaleVisibilityLayerConstraintNumber(self):
        """
        Count ScaleVisibilityLayerConstraint for self layer
        :return: integer
        """

        return self.scale_visibility_layer.count()

    def _permissionsToEditor(self, user, mode='add'):
        setPermissionUserObject(
            user,
            self,
            permissions=[
                'change_layer',
                'delete_layer',
                'view_layer',
                'add_feature',
                'change_feature',
                'change_attr_feature',
                'delete_feature',
            ],
            mode=mode,
        )

    def _permissionsToViewers(self, users_id, mode='add'):
        # If user_id is in LayerAcl not add view_layer permission
        l_acl_users = [
            la.user.pk for la in self.layeracl_set.filter(user__isnull=False)
        ]

        for user_id in users_id:
            execute = True
            if l_acl_users and user_id in l_acl_users and mode == 'add':
                execute = False

            if user_id in l_acl_users and mode != 'add':
                # Remove layer from LayerAcl
                self.layeracl_set.filter(user_id=user_id).delete()

            if execute:
                setPermissionUserObject(
                    User.objects.get(pk=user_id),
                    self,
                    permissions='view_layer',
                    mode=mode,
                )

    def _permissions_to_user_groups_editor(self, groups_id, mode='add'):
        for group_id in groups_id:
            setPermissionUserObject(
                AuthGroup.objects.get(pk=group_id),
                self,
                permissions=[
                    'change_layer',
                    'delete_layer',
                    'view_layer',
                    'add_feature',
                    'change_feature',
                    'change_attr_feature',
                    'delete_feature',
                ],
                mode=mode,
            )

    def _permissions_to_user_groups_viewer(self, groups_id, mode='add'):

        # If group_id is in LayerAcl not add view_layer permission
        l_acl_groups = [la.group.pk for la in self.layeracl_set.filter(group__isnull=False)]

        for group_id in groups_id:
            execute = True
            if l_acl_groups and group_id in l_acl_groups and mode == 'add':
                execute = False

            if group_id in l_acl_groups and mode != 'add':

                # Remove layer from LayerAcl
                self.layeracl_set.filter(group_id=group_id).delete()

            if execute:
                setPermissionUserObject(
                    AuthGroup.objects.get(pk=group_id),
                    self,
                    permissions=['view_layer'],
                    mode=mode,
                )


class Widget(G3WACLModelMixins, models.Model):
    """
    Widget data for project module Qdjango
    """

    TYPES = Choices(*((w['value'], w['name']) for w in list(WIDGET_TYPES.values())))

    name = models.CharField(
        _('Name'),
        max_length=255,
    )

    body = models.TextField(
        _('Body'),
    )

    datasource = models.TextField(
        _('datasource'),
    )

    widget_type = models.CharField(
        _('Type'),
        choices=TYPES,
        max_length=255,
    )

    slug = AutoSlugField(
        _('Slug'),
        populate_from=['name'],
        unique=True,
    )
    layers = models.ManyToManyField(Layer)

    def __str__(self):
        return self.name

    def _permissionsToEditor(self, user, mode='add'):
        permissions = ['qdjango.view_widget']

        if G3W_EDITOR1 in getUserGroups(user):
            permissions += [
                'qdjango.change_widget',
                'qdjango.delete_widget',
            ]

        setPermissionUserObject(
            user,
            self,
            permissions=permissions,
            mode=mode,
        )

    def _permissionsToViewers(self, users_id, mode='add'):
        for user_id in users_id:
            setPermissionUserObject(
                User.objects.get(pk=user_id),
                self,
                permissions='qdjango.view_widget',
                mode=mode,
            )

    @staticmethod
    def get_by_type(type='search'):
        return Widget.objects.filter(widget_type=type)


class CustomerTheme(models.Model):
    """
    Model to store custom Map Theme
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(_('Theme name'), max_length=255)
    theme = models.TextField(_('JSON theme structure'))

    @property
    def styles(self):
        return json.loads(self.theme)['styles']

    @property
    def layerstree(self):
        return json.loads(self.theme)['layerstree']

    def save(self, force_insert=False, force_update=False, using=None,
             update_fields=None):

        super().save(force_insert=force_insert, force_update=force_update, using=using,
             update_fields=update_fields)

        # Invalidate cache project
        self.project.invalidate_cache(user=self.user)

    def __str__(self):
        return self.name

    class Meta:
        constraints = [
            UniqueConstraint(
                name='unique_name_user',
                fields=['project', 'user', 'name']
            )
        ]