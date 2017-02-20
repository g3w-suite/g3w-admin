from __future__ import unicode_literals
from django.db import models
from django.utils.text import slugify
from django.utils.translation import ugettext_lazy as _
from model_utils.models import TimeStampedModel
from autoslug import AutoSlugField
from qdjango.models import Project, Layer
import os
import json


def getOdtfilePath(instance, filename):
    """
    Custom name for uploaded odt template file.
    """
    cduTitle = slugify(unicode(instance.title))
    namefile, ext = filename.split('.')
    filename = b'{}_{}.{}'.format(cduTitle, namefile, ext)
    return os.path.join('cdu_odt_file', filename)


class Configs(TimeStampedModel):
    title = models.CharField(_('Title'), max_length=300, unique=True)
    description = models.TextField(_('Description'), blank=True)
    project = models.ForeignKey(Project, models.CASCADE)
    odtfile = models.FileField(_('ODT Template file'), null=True, upload_to=getOdtfilePath)
    slug = AutoSlugField(_('Slug'), populate_from='title', unique=True, always_update=True, blank=True)

    def __unicode__(self):
        return self.title

    def layer_catasto(self):
        """
        Return from layers layer with catasto property is true
        """
        try:
            return self.layers_set.filter(catasto=True)[0]
        except:
            return None

    def layers_against(self):
        """
        Return from layers layer with catasto property is true
        """
        return self.layers_set.filter(catasto=False)

    class Meta:
        permissions = (
            ('make_cdu', 'Can make CDU analisys'),
            ('view_configs', 'Can view configs')
        )


class Layers(models.Model):
    config = models.ForeignKey(Configs)
    layer = models.ForeignKey(Layer, models.CASCADE)
    alias = models.CharField(blank=True, max_length=300, null=True)
    fields = models.TextField()
    catasto = models.BooleanField(default=False)

    def getFieldFoglio(self):
        return self.getLayerFieldsData()['foglio']

    def getFieldParticella(self):
        return self.getLayerFieldsData()['particella']

    def getPlusFieldsCatasto(self):
        if 'plusFieldsCatasto' in self.getLayerFieldsData():
            return self.getLayerFieldsData()['plusFieldsCatasto']
        else:
            return []

    def getLayerFieldsData(self):
        return eval(self.fields)