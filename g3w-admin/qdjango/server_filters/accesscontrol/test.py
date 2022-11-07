# coding=utf-8
""""Test access control filter

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-14'
__copyright__ = 'Copyright 2020, Gis3W'


from qgis.server import QgsAccessControlFilter
from qdjango.apps import QGS_SERVER

import logging

logger = logging.getLogger(__name__)


class TestAccessControlFilter(QgsAccessControlFilter):
    """A filter that denies the layer == TEST_ACCESS_CONTROL
    in the query string"""

    def __init__(self, server_iface):
        super().__init__(server_iface)
        self.server_iface = server_iface

    def layerPermissions(self, layer):
        """Return the layer rights canRead, canInsert, canUpdate, canDelete """

        rh = self.server_iface.requestHandler()

        if not rh:
            logger.critical(
                'TestAccessControlFilter plugin cannot be run in multithreading mode, skipping.')
            return super().layerPermissions(layer)

        if rh.parameterMap().get("TEST_ACCESS_CONTROL", "") == layer.name():
            permissions = QgsAccessControlFilter.LayerPermissions()
            permissions.canRead = False
            permissions.canUpdate = False
            permissions.canDelete = False
            permissions.canCreate = False
            return permissions
        else:
            return super().layerPermissions(layer)

    def cacheKey(self):
        """Return a cache key, a constant value means that the cache works
        normally and this filter does not influence the cache, an empty value
        (which is the default implementation) means that the cache is disabled"""

        # Return a constant: the cache is not influenced by this filter
        return "tac"


# Register the filter, keep a reference because of the garbage collector
ac_filter = TestAccessControlFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerAccessControl(ac_filter, 100)
