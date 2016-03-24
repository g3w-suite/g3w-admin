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


class G3W2Tree(TreeBase):
    module = models.CharField('Qdjango2 Module', max_length=50, null=True, blank=True)


class G3W2TreeItem(TreeItemBase):
    type_header = models.BooleanField('Tipo header', default=False, blank=True)
    icon_css_class = models.CharField('Icon css class', max_length=50,null=True, blank=True)


class Group(TimeStampedModel):
    """A group of projects."""
    UNITS = Choices(
        ('meters', _('Meters')),
        ('feet', _('Feet')),
        ('degrees', _('Degrees')),
        )
    # General info
    name = models.CharField(_('Name'), max_length=255, unique=True)
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='name', unique=True, always_update=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)
    # l10n
    lang = models.CharField(_('lang'), max_length=20, choices=LANGUAGES)
    # Company logo
    header_logo_img = models.FileField(_('headerLogoImg'), upload_to='logo_img')
    header_logo_height = models.IntegerField(_('headerLogoHeight'))
    header_logo_link = models.URLField(_('headerLogoLink'), blank=True, null=True)
    # Max/min scale
    max_scale = models.IntegerField(_('Max scale'))
    min_scale = models.IntegerField(_('Min scale'))
    # Panoramic max/min scale
    panoramic_max_scale = models.IntegerField(_('Panoramic max scale'))
    panoramic_min_scale = models.IntegerField(_('Panoramic min scale'))
    # Unit of measure
    units = models.CharField(_('Units'), choices=UNITS, max_length=255, default='meters')
    # Group SRID (a.k.a. EPSG)
    srid = models.IntegerField(_('SRID/EPSG'))
    # use Google/Bing base maps
    use_commercial_maps = models.BooleanField(_('Use commercial maps'),default=False)
    use_osm_maps = models.BooleanField(_('Use OpenStreetMap base map'),default=False)
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



class GroupProjectPanoramic(models.Model):

    group = models.ForeignKey(Group, models.CASCADE, related_name='project_panoramic', verbose_name=_('Group'))
    project_type = models.CharField(verbose_name=_('Project type'), max_length=255)
    project_id = models.IntegerField(verbose_name=_('Project type id'))