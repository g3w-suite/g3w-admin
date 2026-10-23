# coding=utf-8
""""QGIS QgisAuth DB model, synced to QGIS QgisAuth DB

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-01-04'
__copyright__ = 'Copyright 2021, G3W-Suite'

import ast
import logging
import random

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete, post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from qdjango.utils.models import temp_disconnect_signal
from qgis.core import QgsApplication, QgsAuthMethodConfig

logger = logging.getLogger(__name__)


class LayerDependenciesError(Exception):
    """Raised when attempting to delete a QgisAuth that is used by one or more layers"""

    pass

def sync(model):
    """Syncs the model with the QGIS data base"""

    kwargs = {
        'signal': post_delete,
        'receiver': sync_auth_delete,
        'sender': QgisAuth,
        'dispatch_uid': None
    }

    with temp_disconnect_signal(**kwargs):
        kwargs = {
        'signal': pre_delete,
        'receiver': check_layer_dependencies,
        'sender': QgisAuth,
        'dispatch_uid': None
        }
        with temp_disconnect_signal(**kwargs):
            model._objects.all().delete()

    am = QgsApplication.instance().authManager()

    kwargs = {
        'signal': post_save,
        'receiver': sync_auth_save,
        'sender': QgisAuth,
        'dispatch_uid': None
    }

    with temp_disconnect_signal(**kwargs):
        for authcfg in sorted(am.configIds()):
            c = QgsAuthMethodConfig()
            am.loadAuthenticationConfig(authcfg, c, True)
            model._objects.create(id=c.id(), name=c.name(), config=c.configMap(
            ), uri=c.uri(), version=c.version(), method=c.method())


class QgisAuthSyncManager(models.Manager):
    """Syncing manager"""

    def get_queryset(self):
        sync(self.model)
        return super().get_queryset()


def default_authid():
    """Creates a unique auth id"""

    am = QgsApplication.instance().authManager()
    while True:
        hash = random.getrandbits(128)
        id = ("%032x" % hash)[:7]
        if not id in am.configIds():
            return id

class QgisAuth(models.Model):
    """Model definition for QgisAuth."""



    id = models.CharField(_("Auth ID"), max_length=7, default=default_authid, validators=[RegexValidator(r'[A-z0-9]{7}')],
                          primary_key=True, help_text=_('7 alphanumeric ASCII chars'))
    name = models.CharField(_("Name"), max_length=256)
    uri = models.CharField(_("URI"), max_length=256, null=True,
                           blank=True, help_text=_('Currently not implemented'))
    method = models.CharField(_("Method"), max_length=32, editable=False, default='Basic')
    version = models.IntegerField(_("Version"), default=2, editable=False)
    config = models.TextField(_("Config"), default="{'password': '<your_password>', 'username': '<your_username>', 'realm': ''}",
                              help_text=_('Fill in username and passwword, realm is not implemented and it can be left blank'))

    # Syncing manager
    objects = QgisAuthSyncManager()

    # Original manager
    _objects = models.Manager()

    class Meta:
        """Meta definition for QgisAuth."""

        verbose_name = _('QGIS Authentication')
        verbose_name_plural = _('QGIS Authentications')

    def __str__(self):
        """Unicode representation of QgisAuth."""

        return self.id


@receiver(post_delete, sender=QgisAuth)
def sync_auth_delete(sender, instance, **kwargs):
    """Sync the QGIS auth DB after delete"""

    am = QgsApplication.instance().authManager()
    am.removeAuthenticationConfig(instance.id)


@receiver(post_save, sender=QgisAuth)
def sync_auth_save(sender, instance, **kwargs):
    """Sync the QGIS auth DB after save"""

    c = QgsAuthMethodConfig()
    c.setId(instance.id)
    c.setMethod(instance.method)
    c.setName(instance.name)
    c.setUri(instance.uri)
    c.setVersion(instance.version)
    c.setConfigMap(ast.literal_eval(instance.config))
    am = QgsApplication.instance().authManager()
    if c.id() in am.configIds():
        am.updateAuthenticationConfig(c)
    else:
        am.storeAuthenticationConfig(c)


@receiver(pre_delete, sender=QgisAuth)
def check_layer_dependencies(sender, instance, using, **kwargs):
    """Check for layer dependencies before delete and raises if any"""

    from qdjango.models import Layer
    dependent_layers = [l.name for l in  Layer.objects.filter(datasource__contains=instance.id)]
    if len(dependent_layers) > 0:
        raise LayerDependenciesError(_("QGIS Auth %s cannot be deleted because it is used by the following layers: %s" % (instance.id, ', '.join(dependent_layers))))

