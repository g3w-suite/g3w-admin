from __future__ import unicode_literals
from django.conf import settings
from django.conf.global_settings import LANGUAGES
from django.utils.translation import ugettext, ugettext_lazy as _
from django.core.urlresolvers import reverse
from django.db import models
from django.apps import apps
from model_utils.models import TimeStampedModel
from model_utils import Choices
from autoslug import AutoSlugField
from sitetree.models import TreeItemBase, TreeBase
from django.contrib.auth.models import User
from usersmanage.utils import setPermissionUserObject, getUserGroups
from usersmanage.configs import *
from .utils.structure import getProjectsByGroup
try:
    from osgeo import osr
except:
    pass


class G3W2Tree(TreeBase):
    module = models.CharField('Qdjango2 Module', max_length=50, null=True, blank=True)


class G3W2TreeItem(TreeItemBase):
    type_header = models.BooleanField('Tipo header', default=False, blank=True)
    icon_css_class = models.CharField('Icon css class', max_length=50,null=True, blank=True)


class G3WSpatialRefSys(models.Model):
    """
    Clone of Postgis spatial_ref_sys for no geo database
    """
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=256)
    auth_srid = models.IntegerField()
    srtext = models.CharField(max_length=2048)
    proj4text = models.CharField(max_length=2048)

    def __unicode__(self):
        '''
        try:
            sref = osr.SpatialReference()
            sref.ImportFromWkt(self.srtext)
            return "{} - [{}] - {}".format(str(self.srid), sref.GetLinearUnitsName(), sref.GetAttrValue())
        except Exception as e:
        '''
        return "{} {}".format(self.auth_name, str(self.srid))


class BaseLayer(models.Model):
    """
    Model to store Base layers
    """
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    property = models.TextField()

    def __unicode__(self):
        return "{} ({})".format(self.title, self.name)

    class Meta:
        verbose_name = 'Base Layer'
        verbose_name_plural = 'Base Layers'


class MapControl(models.Model):
    """
    Model for Map Controls: zoom, query, etc..
    """
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name = _('Map control')
        verbose_name_plural = _('Map controls')


class Group(TimeStampedModel):
    """A group of projects."""
    # General info
    name = models.CharField(_('Name'), max_length=255, unique=True)
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='name', unique=True, always_update=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)

    # l10n
    lang = models.CharField(_('lang'), max_length=20, choices=LANGUAGES, default='it')

    # Company logo
    header_logo_img = models.FileField(_('headerLogoImg'), upload_to='logo_img')
    header_logo_link = models.URLField(_('headerLogoLink'), blank=True, null=True,
                                       help_text=_('Enter link with http:// or https//'))

    # Max/min scale
    max_scale = models.IntegerField(_('Max scale'))
    min_scale = models.IntegerField(_('Min scale'))

    # Panoramic max/min scale
    panoramic_max_scale = models.IntegerField(_('Panoramic max scale'))
    panoramic_min_scale = models.IntegerField(_('Panoramic min scale'))

    # Group SRID (a.k.a. EPSG)
    srid = models.ForeignKey(G3WSpatialRefSys, db_column='srid')

    # baselayers
    baselayers = models.ManyToManyField(BaseLayer, blank=True)

    # mapcontrols
    mapcontrols = models.ManyToManyField(MapControl)

    # background color map default
    background_color = models.CharField(max_length=7, default='#ffffff', blank=True)

    # Company TOS
    header_terms_of_use_text = models.TextField(
        _('headerTermsOfUseText'), blank=True
        )
    header_terms_of_use_link = models.URLField(
        _('headerTermsOfUseLink'), blank=True
        )

    class Meta:
        permissions = (
            ('view_group', 'Can view group'),
        )

    def __unicode__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('group-detail', kwargs={'slug': self.slug})

    def getProjectsNumber(self):
        """
        Count total number of serveral type project
        :return: integer
        """
        groupProjects = 0
        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            groupProjects += len(Project.objects.filter(group=self))
        return groupProjects

    def addPermissionsToEditor(self, user):
        """
        Give guardian permissions to Editor
        """

        permissions = ['core.view_group']
        if G3W_EDITOR1 in getUserGroups(user):
            permissions += [
                'core.change_group',
                'core.delete_group'
            ]

        setPermissionUserObject(user, self, permissions=permissions)

        # adding permissions to projects
        appProjects = getProjectsByGroup(self)
        for app, projects in appProjects.items():
            for project in projects:
                project.addPermissionsToEditor(user)

    def removePermissionsToEditor(self, user):
        """
        Remove guardian permissions to Editor
        """

        setPermissionUserObject(user, self, permissions=[
            'core.change_group',
            'core.delete_group',
            'core.view_group',
        ], mode='remove')

        # adding permissions to projects
        appProjects = getProjectsByGroup(self)
        for app, projects in appProjects.items():
            for project in projects:
                project.removePermissionsToEditor(user)

    def addPermissionsToViewers(self, users_id):
        """
        Give guardian permissions to Viewers
        """
        appProjects = getProjectsByGroup(self)

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='core.view_group')

            # adding permissions to projects
            for app, projects in appProjects.items():
                for project in projects:
                    project.addPermissionsToViewers(users_id)

    def removePermissionsToViewers(self, users_id):
        """
        Remove guardian permissions to Viewers
        """
        appProjects = getProjectsByGroup(self)

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='core.view_group', mode='remove')

            # adding permissions to projects
            for app, projects in appProjects.items():
                for project in projects:
                    project.removePermissionsToViewers(users_id)


class GroupProjectPanoramic(models.Model):

    group = models.ForeignKey(Group, models.CASCADE, related_name='project_panoramic', verbose_name=_('Group'))
    project_type = models.CharField(verbose_name=_('Project type'), max_length=255)
    project_id = models.IntegerField(verbose_name=_('Project type id'))


