from __future__ import unicode_literals
from django.db import models
from django.utils.text import slugify
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from model_utils.models import TimeStampedModel
from autoslug import AutoSlugField
from qdjango.models import Project, Layer
from usersmanage.utils import getUserGroups, setPermissionUserObject
from usersmanage.configs import *
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

    def addPermissionsToEditor(self, user):
        """
        Give guardian permissions to Editor
        """

        permissions = ['cdu.view_configs', 'cdu.make_cdu']
        if G3W_EDITOR1 in getUserGroups(user):
            permissions += [
                'cdu.change_configs',
                'cdu.delete_configs'
            ]

        setPermissionUserObject(user, self, permissions=permissions)

    def removePermissionsToEditor(self, user):
        """
        Remove guardian permissions to Editor
        """

        setPermissionUserObject(user, self, permissions=[
            'cdu.change_configs',
            'cdu.delete_configs',
            'cdu.view_configs',
            'cdu.make_cdu'
        ], mode='remove')
        
    
    def addPermissionsToViewers(self, users_id):
        """
        Give guardian permissions to Viewers
        """

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self,
                                    permissions=['cdu.view_configs', 'cdu.make_cdu'])

    def removePermissionsToViewers(self, users_id):
        """
        Remove guardian permissions to Viewers
        """

        for user_id in users_id:
            setPermissionUserObject(User.objects.get(pk=user_id), self,
                                    permissions=['cdu.view_configs', 'cdu.make_cdu'], mode='remove')


class Layers(models.Model):
    config = models.ForeignKey(Configs, models.CASCADE)
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