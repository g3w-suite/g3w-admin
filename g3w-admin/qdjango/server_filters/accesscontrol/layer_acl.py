# coding=utf-8
"""" Che layer acl
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = "lorenzetti@gis3w.it"
__date__ = "2023-09-25"
__copyright__ = "Copyright 2015 - 2023, Gis3w"
__license__ = "MPL 2.0"

from django.conf import settings
from guardian.shortcuts import get_perms, get_anonymous_user
from qgis.server import QgsAccessControlFilter
from qgis.core import QgsMessageLog, Qgis
from qdjango.apps import QGS_SERVER
from qdjango.models import Layer
from urllib.parse import urlparse, parse_qs



class LayerAclAccessControlFilter(QgsAccessControlFilter):
    """Filter layer by ACL properties"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

        self.server_iface = server_iface

    def layerPermissions(self, layer):

        rights = QgsAccessControlFilter.LayerPermissions()

        if layer.customProperty('g3w-suite-internal', False):
            rights.canRead = True

        try:
            qdjango_layer = Layer.objects.get(
                project=QGS_SERVER.project, qgs_layer_id=layer.id())

            # Check for caching
            purl = urlparse(self.server_iface.requestHandler().url())
            qs = parse_qs(purl.query)
            arg = 'g3wsuite_caching_token'.upper()
            if ((len(set(settings.G3WADMIN_LOCAL_MORE_APPS).intersection(set(['caching', 'qmapproxy']))) > 0 and
                     arg in qs and
                    settings.TILESTACHE_CACHE_TOKEN == qs[arg][0]) and
                    f"{purl.scheme}://{purl.netloc}" == settings.QDJANGO_SERVER_URL):
                rights.canRead = True
                rights.canInsert = False
                rights.canUpdate = False
                rights.canDelete = False

            else:

                # Check permission
                perms = list(
                    set(get_perms(QGS_SERVER.user, qdjango_layer)) |
                    set(get_perms(get_anonymous_user(), qdjango_layer))
                )
                rights.canRead = "view_layer" in perms
                rights.canInsert = "add_layer" in perms
                rights.canUpdate = "change_layer" in perms
                rights.canDelete = "delete_layer" in perms

        except Layer.DoesNotExist:
            pass

        return rights


# Register the filter, keep a reference because of the garbage collector
layeracl_filter = LayerAclAccessControlFilter(QGS_SERVER.serverInterface())
# Note: this should be the last filter, set the priority to 10000
QGS_SERVER.serverInterface().registerAccessControl(layeracl_filter, 10010)