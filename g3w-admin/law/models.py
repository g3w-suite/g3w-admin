from django.db import models
from model_utils.models import TimeStampedModel
from django.utils.translation import ugettext_lazy as _
from autoslug import AutoSlugField

class Laws(TimeStampedModel):
    name = models.CharField(_('Law name'),max_length=255)
    description = models.TextField(_('Law description'), blank=True)
    variation = models.CharField(_('Variation'),max_length=255, blank=True)
    fromdate = models.DateField(_('Valid from'))
    todate = models.DateField(_('Valid to'))
    slug = AutoSlugField(_('Slug'), populate_from='name', unique=True,always_update=True,blank=True)

    def __unicode__(self):
        return self.name

    class Meta:
        permissions = (
            ('view_laws', 'Can view laws list'),
        )

    @staticmethod
    def getJsList():
        jsdata = []
        laws = Laws.objects.all()
        for l in laws:
            jsdata.append({
                'id': l.pk,
                'name': l.name,
                'variation': l.variation
            })
        return jsdata

    def getArticlesNumber(self):
        return len(self.articles_set.all())


class Articles(models.Model):
    number = models.CharField(_('Article number'),max_length=255)
    title = models.CharField(_('Title'),max_length=255,blank=True)
    comma = models.CharField(_('Article comma number'),max_length=255,blank=True)
    content = models.TextField(_('Article content'))
    law = models.ForeignKey(Laws,blank=True,null=True)
    slug = AutoSlugField(_('Slug'), populate_from='number', unique=True,always_update=True,blank=True,null=True)

    class Meta:
        permissions = (
            ('view_articles', 'Can view law articles list'),
        )

    def __unicode__(self):
        return _('Article')+" {}".format(self.number)