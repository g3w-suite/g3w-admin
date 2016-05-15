from django.db import models
from model_utils.models import TimeStampedModel
from model_utils import Choices
from autoslug import AutoSlugField
from django.utils.translation import ugettext_lazy as _
from core.models import Group


class Project(TimeStampedModel):

    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='title', unique=True, always_update=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)

    # Thumbnail
    thumbnail = models.ImageField(_('Thumbnail'), blank=True, null=True)

    # Group
    group = models.ForeignKey(Group, related_name='ogc_projetc_group', verbose_name=_('Group'))


    # Extent
    initial_extent = models.CharField(_('Initial extent'), max_length=255)
    max_extent = models.CharField(_('Max extent'), max_length=255)

    # Whether current project acts as a panoramic map within group
    is_panoramic_map = models.BooleanField(_('Is panoramic map'), default=0)

    class Meta:
        unique_together = (('title', 'group'))
        permissions = (
            ('view_ogc_project', 'Can view OGC project'),
        )


class Store(models.Model):

    STORE_TYPES = Choices(
        ('wms', _('WMS')),
        ('wmst'), _('WMST'),
        ('wfs', _('WFS')),
    )

    name = models.CharField(_('Name'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    type = models.CharField(_('OGC Type'), choices=STORE_TYPES, max_length=20)
    url = models.URLField(_('URL'))
    username = models.URLField(_('Username'), max_length=255, null=True, blank=True)
    password = models.CharField(_('Passaword'), max_length=255, null=True, blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='name', unique=True, always_update=True
    )

    class Meta:
        permissions = (
            ('view_ogc_store', 'Can view OGC store'),
        )

class Layer(models.Model):
    """A OGC layer."""

    TYPES = Choices(
        ('wms', _('WMS')),
        ('wmst'), _('WMST'),
        ('tms', _('TMS')),
        )
    # General info
    name = models.CharField(_('Name'), max_length=255)
    title = models.CharField(_('Title'), max_length=255, blank=True)
    description = models.TextField(_('Description'), blank=True)
    attribution = models.TextField(_('Attributions'), blank=True)
    slug = AutoSlugField(
        _('Slug'), populate_from='name', unique=True, always_update=True
        )
    is_active = models.BooleanField(_('Is active'), default=1)
    # Project
    project = models.ForeignKey(Project, verbose_name=_('OGC Project'))
    # Type and content
    layer_type = models.CharField(_('Type'), choices=TYPES, max_length=255)
    datasource = models.TextField(_('Datasource'), blank=True)
    layers = models.TextField(_('Layers(WMS)'),blank=True)
    is_visible = models.BooleanField(_('Is visible'), default=1)
    order = models.IntegerField(_('Order'),default=1)
    # Optional data file (non-postgres layers need it)

    def __unicode__(self):
        return self.name

    class Meta:
        unique_together = (('name', 'project',),)
        ordering = ['order']
        permissions = (
            ('view_ogc_layer', 'Can view OGC layer'),
        )