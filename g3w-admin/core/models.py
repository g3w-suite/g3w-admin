
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.db import models
from django.apps import apps
from guardian.shortcuts import get_objects_for_user
from guardian.compat import get_user_model
from ordered_model.models import OrderedModel
from model_utils.models import TimeStampedModel
from sitetree.models import TreeItemBase, TreeBase
from django.contrib.auth.models import User, Group as AuthGroup
from usersmanage.utils import setPermissionUserObject, getUserGroups, get_users_for_object, get_groups_for_object
from usersmanage.configs import *
from .utils.structure import getProjectsByGroup
from .fields import AutoSlugField
try:
    from osgeo import osr
except:
    pass

import string
import random
import logging

class G3W2Tree(TreeBase):
    module = models.CharField(_('Qdjango2 module'), max_length=50, null=True, blank=True)


class G3W2TreeItem(TreeItemBase):
    type_header = models.BooleanField(_('Type header'), default=False, blank=True)
    icon_css_class = models.CharField(_('Icon CSS class'), max_length=50,null=True, blank=True)


class G3WSpatialRefSys(models.Model):
    """
    Clone of Postgis spatial_ref_sys for no geo database
    """
    srid = models.IntegerField(_('SRID'), primary_key=True)
    auth_name = models.CharField(_('SRS name'), max_length=256)
    auth_srid = models.IntegerField(_('SRS ID'))
    srtext = models.CharField(_('WKT SRS'), max_length=2048)
    proj4text = models.CharField(_('PROJ coordinate definition'), max_length=2048)

    def __str__(self):
        '''
        try:
            sref = osr.SpatialReference()
            sref.ImportFromWkt(self.srtext)
            return "{} - [{}] - {}".format(str(self.srid), sref.GetLinearUnitsName(), sref.GetAttrValue())
        except Exception as e:
        '''
        return "{} {}".format(self.auth_name, str(self.srid))


class BaseLayer(OrderedModel):
    """
    Model to store Base layers
    """
    name = models.CharField(_('Name'), max_length=255)
    title = models.CharField(_('Title'), max_length=255)
    icon = models.ImageField(_('Icon'), null=True, blank=True)
    description = models.TextField(_('Description'), null=True, blank=True)
    property = models.TextField(_('Property'))

    def __str__(self):
        return "{} ({})".format(self.title, self.name)

    class Meta(OrderedModel.Meta):
        verbose_name = _('Base Layer')
        verbose_name_plural = _('Base Layers')


class MapControl(OrderedModel):
    """
    Model for Map Controls: zoom, query, etc..
    """
    name = models.CharField(_('Name'), max_length=255)
    description = models.TextField(_('Description'), null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta(OrderedModel.Meta):
        verbose_name = _('Map control')
        verbose_name_plural = _('Map controls')


class MacroGroup(TimeStampedModel, OrderedModel):
    """
    Model for Macro groups, no ACL
    """

    name = models.CharField(_('Identification name'), max_length=255, null=True,
                            help_text=_('Internal identification Macrogroup name'))
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    logo_img = models.FileField(_('Logo image'), upload_to='macrogroup/logo_img')
    logo_link = models.URLField(_('Logo link'), blank=True, null=True,
                                       help_text=_('Enter link with http:// or https//'))
    use_title_client = models.BooleanField(_('Use title for client'), default=False)
    use_logo_client = models.BooleanField(_('Use logo image for client'), default=False)

    slug = AutoSlugField(
        _('Slug'), unique=True, populate_from=['name'])

    def __str__(self):
        return self.title

    def _permissions_to_editors(self, users_id, mode='add'):

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='view_macrogroup', mode=mode)

    def add_permissions_to_editors(self, users_id):
        """
        Give guardian permissions to Editors
        """
        self._permissions_to_editors(users_id, 'add')

    def remove_permissions_to_editors(self, users_id):
        """
        Remove guardian permissions to Editors
        """
        self._permissions_to_editors(users_id, 'remove')

    class Meta():
        verbose_name = _('MACRO Group')
        verbose_name_plural = _('MACRO Groups')
        ordering = ("order",)


class Group(TimeStampedModel, OrderedModel):
    """A group of projects."""
    # General info
    name = models.CharField(_('Name'), max_length=255, unique=True)
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from=['name'], unique=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)

    # Company logo
    header_logo_img = models.FileField(_('Logo image'), upload_to='logo_img',
                                       default=f'logo_img/{settings.CLIENT_G3WSUITE_LOGO}')
    header_logo_link = models.URLField(_('Logo link'), blank=True, null=True,
                                       help_text=_('Enter link with http:// or https//'))

    # Group SRID (a.k.a. EPSG)
    srid = models.ForeignKey(G3WSpatialRefSys, db_column='srid', on_delete=models.DO_NOTHING, verbose_name=_('SRID'))

    # baselayers
    baselayers = models.ManyToManyField(BaseLayer, blank=True, verbose_name=_('Base layers'))

    # mapcontrols
    mapcontrols = models.ManyToManyField(MapControl, verbose_name=_('Map controls'))

    # background color map default
    background_color = models.CharField(_('Background color'), max_length=7, default='#ffffff', blank=True)

    # Company TOS
    header_terms_of_use_text = models.TextField(
        _('Terms of use text'), blank=True
        )
    header_terms_of_use_link = models.URLField(
        _('Terms of use link'), blank=True
        )

    macrogroups = models.ManyToManyField(MacroGroup, blank=True, verbose_name=_('MACRO groups'))

    use_logo_client = models.BooleanField(_('Use logo image for client'), default=False,
                                          help_text=_('As for MacroGroup options is possible to use current logo group '
                                                      'as client logo, if MacroGroup option is active this options takes '
                                                      'precendence'))

    class Meta():
        verbose_name = _('Group')
        verbose_name_plural = _('Groups')
        permissions = (
            ('add_project_to_group', 'Can add project to the group'),
        )
        ordering = ("order",)


    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('group-detail', kwargs={'slug': self.slug})

    def get_panoramic_project(self):
        try:
            group_pano_project = GroupProjectPanoramic.objects.get(group=self)
            Project = apps.get_app_config(group_pano_project.project_type).get_model('project')
            return Project.objects.get(pk=group_pano_project.project_id)
        except:
            return None

    def getProjects(self):
        """
        Get every type projects for group
        """
        groupProjects = []
        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            projects = Project.objects.filter(group=self).order_by('title')
            groupProjects += [(g3wProjectApp, project) for project in projects]
        return groupProjects

    def getProjectsNumber(self, user=None, is_active=None):
        """
        Count total number of serveral type project
        :return: integer
        """
        groupProjects = 0
        for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
            Project = apps.get_app_config(g3wProjectApp).get_model('project')
            if user:
                qs = get_objects_for_user(user, '{}.view_project'.format(g3wProjectApp), Project) \
                    .filter(group=self)
            else:
                qs = Project.objects.filter(group=self)

            if is_active and is_active in (0, 1):
                qs = qs.filter(is_active=is_active)

            groupProjects += len(qs)

        return groupProjects

    def addPermissionsToEditor(self, user):
        """
        Give guardian permissions to Editor every level
        """

        permissions = ['view_group', 'add_project_to_group'] # valid for editor2
        user_groups = getUserGroups(user)
        if G3W_EDITOR1 in user_groups:
            permissions += [
                'add_project_to_group',
                'change_group',
                'delete_group'
            ]

        setPermissionUserObject(user, self, permissions=permissions)

        # adding permissions to projects
        appProjects = getProjectsByGroup(self)
        for app, projects in list(appProjects.items()):
            for project in projects:
                project.addPermissionsToEditor(user)

    def removePermissionsToEditor(self, user):
        """
        Remove guardian permissions to Editor
        """

        setPermissionUserObject(user, self, permissions=[
            'change_group',
            'delete_group',
            'view_group',
            'add_project_to_group'
        ], mode='remove')

        # adding permissions to projects
        appProjects = getProjectsByGroup(self)
        for app, projects in list(appProjects.items()):
            for project in projects:
                project.removePermissionsToEditor(user)

    def addPermissionsToViewers(self, users_id, **kwargs):
        """
        Give guardian permissions to Viewers
        """
        appProjects = getProjectsByGroup(self)

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='view_group')

            # adding permissions to projects only if propagate
            if 'propagate' in kwargs:
                for app, projects in list(appProjects.items()):
                    for project in projects:
                        project.addPermissionsToViewers(users_id)

    def removePermissionsToViewers(self, users_id):
        """
        Remove guardian permissions to Viewers
        """
        appProjects = getProjectsByGroup(self)

        # anonynous users id
        anonymous_uid = get_user_model().get_anonymous().pk

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self, permissions='view_group', mode='remove')

            # adding permissions to projects
            # not for anonymous user, who exit from this flow
            if user_id != anonymous_uid:
                for app, projects in list(appProjects.items()):
                    for project in projects:
                        project.removePermissionsToViewers(users_id)

    def add_permissions_to_editor_user_groups(self, groups_id):
        """
        Give guardian permissions to Editor user groups
        """

        appProjects = getProjectsByGroup(self)
        permissions = [
            'view_group',
            'add_project_to_group'
        ]

        for group_id in groups_id:
            setPermissionUserObject(AuthGroup.objects.get(pk=group_id), self, permissions=permissions)

            # adding permissions to projects

            for app, projects in list(appProjects.items()):
                for project in projects:
                    if hasattr(project, 'add_permissions_to_editor_user_groups'):
                        project.add_permissions_to_editor_user_groups(groups_id)

    def remove_permissions_to_editor_user_groups(self, groups_id):
        """
        Remove guardian permissions to Editor user groups
        """
        appProjects = getProjectsByGroup(self)

        permissions = [
            'view_group',
            'add_project_to_group'
        ]

        for group_id in groups_id:
            setPermissionUserObject(AuthGroup.objects.get(pk=group_id), self, permissions=permissions,
                                    mode='remove')


            for app, projects in list(appProjects.items()):
                for project in projects:
                    if hasattr(project, 'remove_permissions_to_editor_user_groups'):
                        project.remove_permissions_to_editor_user_groups(groups_id)

    def add_permissions_to_viewer_user_groups(self, groups_id, **kwargs):
        """
        Give guardian permissions to Editor user groups
        """

        appProjects = getProjectsByGroup(self)
        permissions = [
            'view_group'
        ]

        for group_id in groups_id:
            setPermissionUserObject(AuthGroup.objects.get(pk=group_id), self, permissions=permissions)

            # adding permissions to projects only if propagate
            if 'propagate' in kwargs:
                for app, projects in list(appProjects.items()):
                    for project in projects:
                        if hasattr(project, 'add_permissions_to_viewer_user_groups'):
                            project.add_permissions_to_viewer_user_groups(groups_id)

    def remove_permissions_to_viewer_user_groups(self, groups_id):
        """
        Remove guardian permissions to Editor user groups
        """
        appProjects = getProjectsByGroup(self)

        permissions = [
            'view_group'
        ]

        for group_id in groups_id:
            setPermissionUserObject(AuthGroup.objects.get(pk=group_id), self, permissions=permissions,
                                    mode='remove')

            # removing permissions to projects
            for app, projects in list(appProjects.items()):
                for project in projects:
                    if hasattr(project, 'remove_permissions_to_viewer_user_groups'):
                        project.remove_permissions_to_viewer_user_groups(groups_id)

    def __getattr__(self, attr):
        if attr == 'viewers':
            return get_users_for_object(self, 'view_group', [G3W_VIEWER1, G3W_VIEWER2], with_anonymous=True)
        elif attr == 'editor':
            editors = get_users_for_object(self, 'change_group', [G3W_EDITOR2, G3W_EDITOR1])
            if len(editors) > 0:
                return editors[0]
        elif attr == 'editor1':
            editors = get_users_for_object(self, 'change_group', [G3W_EDITOR1])
            if len(editors) > 0:
                return editors[0]
        elif attr == 'editor2':
            editors = get_users_for_object(self, 'view_group', [G3W_EDITOR2])
            if len(editors) > 0:
                return editors[0]

        # Get users groups
        # ================
        elif attr == 'editor_user_groups':
            return get_groups_for_object(self, 'view_group', 'editor')
        elif attr == 'viewer_user_groups':
            return get_groups_for_object(self, 'view_group', 'viewer')

        return super(Group, self).__getattribute__(attr)


class GroupProjectPanoramic(models.Model):

    group = models.ForeignKey(Group, models.CASCADE, related_name='project_panoramic', verbose_name=_('Group'))
    project_type = models.CharField(verbose_name=_('Project type'), max_length=255)
    project_id = models.IntegerField(verbose_name=_('Project type id'))


class GeneralSuiteData(models.Model):
    """
    Model for general data, to use on frontend
    """
    title = models.CharField(_('Title'), max_length=255)
    sub_title = models.CharField(_('Subtitle'), max_length=255, null=True, blank=True)
    home_description = models.TextField(_('Home description'), null=True, blank=True)
    about_title = models.CharField(_('About title'), max_length=255)
    about_description = models.TextField(_('About description'), null=True, blank=True)
    about_name = models.CharField(_('About name'), max_length=255)
    about_tel = models.CharField(_('About phone'), max_length=255, null=True, blank=True)
    about_email = models.EmailField(_('About email'), null=True, blank=True)
    about_address = models.CharField(_('About address'), max_length=255, null=True, blank=True)
    groups_title = models.CharField(_('Groups title'), max_length=255)
    groups_map_description = models.TextField(_('Groups map description'), null=True, blank=True)
    login_title = models.CharField(_('Login title'), max_length=255, null=True, blank=True)
    login_description = models.TextField(_('Login description'), null=True, blank=True)
    suite_logo = models.ImageField(_('Suite logo'), null=True, blank=True)
    url_suite_logo = models.URLField(_('Suite logo URL'), null=True, blank=True)
    registration_intro = models.TextField(_('Registration introductory message'), null=True, blank=True)

    # custom credits
    credits = models.TextField(_('Credits'), null=True, blank=True)

    # data fro map client
    main_map_title = models.CharField(_('Main map title'), max_length=400, null=True, blank=True)

    facebook_url = models.URLField(_('Facebook link'), null=True, blank=True)
    twitter_url = models.URLField(_('Twitter link'), null=True, blank=True)
    googleplus_url = models.URLField(_('Google+ link'), null=True, blank=True)
    youtube_url = models.URLField(_('Youtube link'), null=True, blank=True)
    instagram_url = models.URLField(_('Instagram link'), null=True, blank=True)
    flickr_url = models.URLField(_('Flickr link'), null=True, blank=True)
    tripadvisor_url = models.URLField(_('Tripadvisor link'), null=True, blank=True)


class ProjectMapUrlAlias(models.Model):
    """
    Model to set alias map url
    ie: /map/qdjango/group-slug/1 => /map/<alias_field_value>
    """
    app_name = models.CharField(_('App name'), max_length=255)
    project_id = models.IntegerField(_('Project ID'), )
    alias =models.CharField(_('Alias'), max_length=512, unique=True)


LOG_LEVELS = (
    (logging.NOTSET, _('NotSet')),
    (logging.INFO, _('Info')),
    (logging.WARNING, _('Warning')),
    (logging.DEBUG, _('Debug')),
    (logging.ERROR, _('Error')),
    (logging.FATAL, _('Fatal')),
)
class StatusLog(models.Model):
    """
    Model to store log's row inside DB
    """
    logger_name = models.CharField(_('Logger name'), max_length=100)
    level = models.PositiveSmallIntegerField(_('Level'), choices=LOG_LEVELS, default=logging.ERROR, db_index=True)
    msg = models.TextField(_('Message'))
    trace = models.TextField(_('Trace'), blank=True, null=True)
    create_datetime = models.DateTimeField(auto_now_add=True, verbose_name=_('Created at'))

    def __str__(self):
        return self.msg

    class Meta:
        ordering = ('-create_datetime',)
        verbose_name = _('Logging')
        verbose_name_plural = _('Logging')


def generate_short_code(length=6):
    """ Generate a random short code """
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

class ShortURL(TimeStampedModel):
    """ Model to store short code for shor url"""
    original_url = models.URLField(_('Original URL'), max_length=2000)
    short_code = models.CharField(_('Short code'), max_length=10, unique=True, blank=True)


    def save(self, *args, **kwargs):
        if not self.short_code:
            while True:
                code = generate_short_code()
                if not ShortURL.objects.filter(short_code=code).exists():
                    self.short_code = code
                    break
        super().save(*args, **kwargs)

    def get_short_url(self):
        return f"su/{self.short_code}"


class PermaLinkURL(TimeStampedModel):
    """
    Model to create a permalink code for store information about the webgis client state.
    I.e. current extent, toc layer switched on/off annotations etc.
    """

    data = models.JSONField(_("Data"))
    permalink_code = models.CharField(_("Permalink code"), max_length=10, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.permalink_code:
            while True:
                code = generate_short_code()
                if not PermaLinkURL.objects.filter(permalink_code=code).exists():
                    self.permalink_code = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return self.permalink_code
