# coding=utf-8
""""Column restrictions on layers based on ColumnAcl

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-01-28'
__copyright__ = 'Copyright 2020, Gis3W'


from qgis.server import QgsAccessControlFilter
from qgis.core import QgsMessageLog, Qgis
from qdjango.apps import QGS_SERVER
from qdjango.models import ConstraintSubsetStringRule, ConstraintExpressionRule, Layer, GeoConstraintRule


class ColumnAclAccessControlFilter(QgsAccessControlFilter):
    """A filter that excludes columns from layers"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def authorizedLayerAttributes(self, layer, attributes):
        """Retrieve and sets column acl"""

        try:
            qdjango_layer = Layer.objects.get(
                project=QGS_SERVER.project, qgs_layer_id=layer.id())
            if qdjango_layer.has_column_acl:
                user = QGS_SERVER.user
                return qdjango_layer.visible_fields_for_user(user)
        except Layer.DoesNotExist:
            pass

        return attributes

    def cacheKey(self):
        """Return a cache key, a constant value means that the cache works
        normally and this filter does not influence the cache, an empty value
        (which is the default implementation) means that the cache is disabled"""

        # Return a constant: the cache is not influenced by this filter
        return "ca"


# Register the filter, keep a reference because of the garbage collector
ac_filter = ColumnAclAccessControlFilter(
    QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerAccessControl(ac_filter, 1)
