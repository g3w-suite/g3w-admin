# coding=utf-8
"""" Che layer acl
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = "lorenzetti@gis3w.it"
__date__ = "2023-09-25"
__copyright__ = "Copyright 2015 - 2023, Gis3w"
__license__ = "MPL 2.0"

from guardian.shortcuts import get_perms
from qgis.server import QgsAccessControlFilter
from qgis.core import QgsMessageLog, Qgis
from qdjango.apps import QGS_SERVER
from qdjango.models import Layer


class LayerAclAccessControlFilter(QgsAccessControlFilter):
    """Filter layer by ACL properties"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def layerPermissions(self, layer):
    
        rights = QgsAccessControlFilter.LayerPermissions()

        try:
            qdjango_layer = Layer.objects.get(
                project=QGS_SERVER.project, qgs_layer_id=layer.id())

            # Check permission
            perms = get_perms(QGS_SERVER.user, qdjango_layer)
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