from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from model_utils.models import TimeStampedModel
from autoslug import AutoSlugField
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User, Group as AuthGroup
from autoslug.utils import slugify
from guardian.shortcuts import get_perms
from core.models import Group, BaseLayer, GroupProjectPanoramic, ProjectMapUrlAlias
from .utils.storage import QgisFileOverwriteStorage
from core.mixins.models import G3WACLModelMixins, G3WProjectMixins
from model_utils import Choices
from usersmanage.utils import setPermissionUserObject, getUserGroups, get_users_for_object
from usersmanage.configs import *
from core.configs import *
from core.receivers import check_overviewmap_project
from core.utils import unicode2ascii
import os


def get_project_file_path(instance, filename):
    """Custom name for uploaded project files."""

    group_name = slugify(unicode(instance.group.name))
    project_name = slugify(unicode(instance.title))
    filename = u'{}_{}.qgs'.format(group_name, project_name)
    return os.path.join('projects', filename)


def get_thumbnail_path(instance, filename):
    """Custom name for uploaded thumbnails."""
    group_name = slugify(unicode(instance.group.name))
    project_name = slugify(unicode(instance.title))
    ext = filename.split('.')[-1]
    filename = u'{}_{}.{}'.format(group_name, project_name, ext)
    return os.path.join('thumbnails', filename)


class Project(G3WProjectMixins, G3WACLModelMixins, TimeStampedModel):
    """A QGIS project."""

    QUERY_TYPE = Choices(
        ('single', _('Single')),
        ('multiple', _('Multiple'))
        )

    # Project file
    qgis_file = models.FileField(
        _('QGIS project file'),
        max_length=400,
        upload_to=get_project_file_path,
        storage=QgisFileOverwriteStorage()
        )

    # General info
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True, null=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='title', unique=True, always_update=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)

    # Thumbnail
    thumbnail = models.ImageField(_('Thumbnail'), blank=True, null=True)

    # Group
    group = models.ForeignKey(Group, related_name='qdjango_project', verbose_name=_('Group'))

    # Extent
    initial_extent = models.CharField(_('Initial extent'), max_length=255)
    max_extent = models.CharField(_('Max extent'), max_length=255, null=True, blank=True)

    # Qgis version project
    qgis_version = models.CharField(_('Qgis project version'), max_length=255, default='')

    # LayersTree project structure
    layers_tree = models.TextField(_('Layers tree structure'), blank=True, null=True)

    # BaseLayer
    baselayer = models.ForeignKey(BaseLayer, verbose_name=_('Base Layer'), related_name='qdjango_project_baselayer',
                                  null=True, blank=True)
    # possible layer relations
    relations = models.TextField(_('Layer relations'), blank=True, null=True)

    # WMSUseLayerIDs
    wms_use_layer_ids = models.BooleanField(_('WMS use layer ids'), default=False)

    # client options:
    #============================================

    feature_count_wms = models.IntegerField(_('Max feature to get for query'), default=5)

    multilayer_query = models.CharField(_('Query control mode'), max_length=20, choices=QUERY_TYPE, default='single')

    multilayer_querybybbox = models.CharField(_('Query by bbox control mode'), max_length=20, choices=QUERY_TYPE,
                                      default='single')

    multilayer_querybypolygon = models.CharField(_('Query by polygon control mode'), max_length=20, choices=QUERY_TYPE,
                                            default='single')

    class Meta:
        verbose_name = _('Project')
        verbose_name_plural = _('Projects')
        unique_together = (('title', 'group'))
        permissions = (
            ('view_project', 'Can view qdjango project'),
        )

    def __unicode__(self):
        return self.title

    def _permissionsToEditor(self, user, mode='add'):

        setPermissionUserObject(user, self, permissions=[
            'change_project',
            'delete_project',
            'view_project'
        ], mode=mode)

        # if editor not has permission on group give permission only view on parent gorup group
        if not user.has_perm('core.view_group', self.group):
            setPermissionUserObject(user, self.group, permissions=[
                'core.view_group'
            ], mode=mode)

        layerAction = 'addPermissionsToEditor' if mode == 'add' else 'removePermissionsToEditor'
        layers = self.layer_set.all()
        for layer in layers:
            getattr(layer, layerAction)(user)

    def _permissionsToViewers(self, users_id, mode='add'):

        for user_id in users_id:
            user = User.objects.get(pk=user_id)
            setPermissionUserObject(user, self, permissions='view_project', mode=mode)

            # if viewer not has permission on group give permission only view on parent gorup group
            if not user.has_perm('core.view_group', self.group):
                setPermissionUserObject(user, self.group, permissions=[
                    'core.view_group'
                ], mode=mode)

            layerAction = 'addPermissionsToViewers' if mode == 'add' else 'removePermissionsToViewers'
            layers = self.layer_set.all()
            for layer in layers:
                getattr(layer, layerAction)(users_id)

    def _permissions_to_user_groups_editor(self, groups_id, mode='add'):

        for group_id in groups_id:
            auth_group = AuthGroup.objects.get(pk=group_id)
            setPermissionUserObject(auth_group, self,
                    permissions=['change_project', 'delete_project', 'view_project'], mode=mode)

            # if viewer not has permission on group give permission only view on parent group
            if 'view_group' not in get_perms(auth_group, self.group):
                setPermissionUserObject(auth_group, self.group, permissions=[
                    'core.view_group'
                ], mode=mode)

            layerAction = 'add_permissions_to_editor_user_groups' if mode == 'add' \
                else 'remove_permissions_to_editor_user_groups'
            layers = self.layer_set.all()
            for layer in layers:
                getattr(layer, layerAction)(groups_id)

    def _permissions_to_user_groups_viewer(self, groups_id, mode='add'):

        for group_id in groups_id:
            auth_group = AuthGroup.objects.get(pk=group_id)
            setPermissionUserObject(auth_group, self, permissions='view_project', mode=mode)

            # if viewer not has permission on group give permission only view on parent group
            if 'view_group' not in get_perms(auth_group, self.group):
                setPermissionUserObject(auth_group, self.group, permissions=[
                    'core.view_group'
                ], mode=mode)

            layerAction = 'add_permissions_to_viewer_user_groups' if mode == 'add' \
                else 'remove_permissions_to_viewer_user_groups'
            layers = self.layer_set.all()
            for layer in layers:
                getattr(layer, layerAction)(groups_id)


    def tree(self):

        def readLeaf(layer, layers):
            if 'nodes' in layer:
                children = []
                for node in layer['nodes']:
                    children.append(readLeaf(node, layers))

                return [u'g_{}'.format(layer['name']), children]
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
            return ProjectMapUrlAlias.objects.get(app_name='qdjango', project_id=self.pk).alias
        except:
            return None

    @url_alias.setter
    def url_alias(self, url_alias):
        if url_alias:
            ProjectMapUrlAlias.objects.update_or_create(app_name='qdjango', project_id=self.pk,
                                                        defaults={'alias': url_alias})
        else:
            try:
                ProjectMapUrlAlias.objects.get(app_name='qdjango', project_id=self.pk).delete()
            except:
                pass

    def __getattr__(self, attr):
        if attr == 'viewers':
            return get_users_for_object(self, 'view_project', [G3W_VIEWER1, G3W_VIEWER2], with_anonymous=True)
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
        return super(Project, self).__getattribute__(attr)


post_delete.connect(check_overviewmap_project, sender=Project)


def get_layer_data_file_path(instance, filename):
    """Custom name for uploaded project files."""

    return settings.DATASOURCE_PATH


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
        ('arcgisfeatureserver', _('ArcGisFeatureServer'))
        )

    # General info
    name = models.CharField(_('Name'), max_length=255)
    title = models.CharField(_('Title'), max_length=255, blank=True)
    origname = models.CharField(_('Original Name'), max_length=256, null=True, blank=True)
    qgs_layer_id = models.CharField(_('Qgis Layer Project ID'), max_length=255, blank=True, null=True)
    description = models.TextField(_('Description'), blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='name', unique=True, always_update=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)
    # Project
    project = models.ForeignKey(Project, verbose_name=_('Project'), on_delete=models.CASCADE)
    # Type and content
    layer_type = models.CharField(_('Type'), choices=TYPES, max_length=255)
    datasource = models.TextField(_('Datasource'))
    is_visible = models.BooleanField(_('Is visible'), default=1)
    order = models.IntegerField(_('Order'),default=1)
    # Optional data file (non-postgres layers need it)
    data_file = models.FileField(
        _('Associated data file'),
        upload_to=get_layer_data_file_path,
        blank=True,
        null=True
        )
    # Database columns (postgres layers need it)
    database_columns = models.TextField(_('Database columns'), blank=True, null=True)

    # minscale and maxscale and scalebasedvisibility
    min_scale = models.IntegerField(_('Layer Min Scale visibility'), blank=True, null=True)
    max_scale = models.IntegerField(_('Layer Max Scale visibility'), blank=True, null=True)
    scalebasedvisibility = models.BooleanField(_('Layer scale based visibility'), default=False)

    # srid
    srid = models.IntegerField(_('Layer SRID'), blank=True, null=True)

    #for capabilities and edit opsions
    capabilities = models.IntegerField(_('Bitwise capabilities'), blank=True, null=True)
    edit_options = models.IntegerField(_('Bitwise edit options'), blank=True, null=True)
    wfscapabilities = models.IntegerField(_('Bitwise wfs options'), blank=True, null=True)

    #geometryType
    geometrytype = models.CharField(_('Geometry type'), max_length=255, blank=True, null=True)

    exclude_attribute_wms = models.TextField(_('Attributes excluded from wms'), blank=True, null=True)
    exclude_attribute_wfs = models.TextField(_('Attributes excluded from wfs'), blank=True, null=True)

    # possible layer relations
    vectorjoins = models.TextField(_('Layer relations'), blank=True, null=True)

    # editing widgets
    edittypes = models.TextField(_('Columns layer widgets'), blank=True, null=True)

    # exclude from legend
    exclude_from_legend = models.BooleanField(_('Exclude to legend'), default=False, blank=True)

    # form editor layout
    editor_layout = models.CharField(_('Form editor layout'), max_length=100, blank=True, null=True)
    editor_form_structure = models.TextField(_('Editor form structure'), blank=True, null=True)

    download = models.BooleanField(_('Download data'), default=False, blank=True)

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name = _('Layer')
        verbose_name_plural = _('Layers')
        unique_together = (('name', 'project', 'qgs_layer_id'),)
        ordering = ['order']
        permissions = (
            ('view_layer', 'Can view qdjango layer'),
        )

    def database_columns_by_name(self):
        return {db_col['name']: db_col for db_col in eval(self.database_columns)}

    def getWidgetsNumber(self):
        """
        Count widgets for self layer
        :return: integer
        """
        return len(Widget.objects.filter(datasource=self.datasource))

    def _permissionsToEditor(self, user, mode='add'):
        setPermissionUserObject(user, self, permissions=[
            'change_layer',
            'delete_layer',
            'view_layer'
        ], mode=mode)

    def _permissionsToViewers(self, users_id, mode='add'):

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='view_layer', mode=mode)

    def _permissions_to_user_groups_editor(self, groups_id, mode='add'):
        for group_id in groups_id:
            setPermissionUserObject(AuthGroup.objects.get(pk=group_id), self, permissions=[
                'change_layer',
                'delete_layer',
                'view_layer'
            ], mode=mode)

    def _permissions_to_user_groups_viewer(self, groups_id, mode='add'):
        for group_id in groups_id:
            setPermissionUserObject(AuthGroup.objects.get(pk=group_id), self, permissions=[
                'view_layer'
            ], mode=mode)


class Widget(G3WACLModelMixins, models.Model):
    """
    Widget data for project module Qdjango
    """

    TYPES = Choices(
        *((w['value'], w['name']) for w in WIDGET_TYPES.values())
    )
    name = models.CharField(_('Name'), max_length=255)
    body = models.TextField(_('Body'))
    datasource = models.TextField(_('datasource'))
    widget_type = models.CharField(_('Type'), choices=TYPES, max_length=255)
    slug = AutoSlugField(
        _('Slug'), populate_from='name', unique=True, always_update=True
    )
    layers = models.ManyToManyField(Layer)

    def __unicode__(self):
        return self.name

    class Meta:
        permissions = (
            ('view_widget', 'Can view widget'),
        )

    def _permissionsToEditor(self, user, mode='add'):
        permissions = [
            'qdjango.view_widget'
        ]

        if G3W_EDITOR1 in getUserGroups(user):
            permissions += [
                'qdjango.change_widget',
                'qdjango.delete_widget'
            ]

        setPermissionUserObject(user, self, permissions=permissions, mode=mode)

    def _permissionsToViewers(self, users_id, mode='add'):

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='qdjango.view_widget', mode=mode)


    @staticmethod
    def get_by_type(type='search'):
        return Widget.objects.filter(widget_type=type)

