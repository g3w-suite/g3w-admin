# coding=utf-8
""""Single layer constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-15'
__copyright__ = 'Copyright 2020, Gis3W'


from qgis.server import QgsAccessControlFilter
from qgis.core import QgsMessageLog, Qgis
from qdjango.apps import QGS_SERVER
from qdjango.models import ConstraintSubsetStringRule, ConstraintExpressionRule, Layer, GeoConstraintRule

class SingleLayerSubsetStringAccessControlFilter(QgsAccessControlFilter):
    """A filter that sets a subset string from the layer constraints"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def layerFilterSubsetString(self, layer):
        """Retrieve and sets user layer constraints"""

        try:
            qdjango_layer = Layer.objects.get(project=QGS_SERVER.project, qgs_layer_id=layer.id())
        except Layer.DoesNotExist:
            return ""

        rule = ConstraintSubsetStringRule.get_rule_definition_for_user(QGS_SERVER.user, qdjango_layer.pk)
        if rule:
            QgsMessageLog.logMessage("SingleLayerSubsetStringAccessControlFilter rule for user %s and layer id %s: %s" % (QGS_SERVER.user, layer.id(), rule), "", Qgis.Info)

        return rule

    def cacheKey(self):
        """Return a cache key, a constant value means that the cache works
        normally and this filter does not influence the cache, an empty value
        (which is the default implementation) means that the cache is disabled"""

        # Return a constant: the cache is not influenced by this filter
        return "sl"



# Register the filter, keep a reference because of the garbage collector
ac_filter = SingleLayerSubsetStringAccessControlFilter(QGS_SERVER.serverInterface())
# Note: this should be the last filter, set the priority to 10000
QGS_SERVER.serverInterface().registerAccessControl(ac_filter, 10000)


class SingleLayerExpressionAccessControlFilter(QgsAccessControlFilter):
    """A filter that sets an expression filter from the layer constraints"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def layerFilterExpression(self, layer):
        """Retrieve and sets user layer constraints"""

        try:
            qdjango_layer = Layer.objects.get(project=QGS_SERVER.project, qgs_layer_id=layer.id())
        except Layer.DoesNotExist:
            # This is a special case for internal layers, we don't want to log this
            if not layer.customProperty('g3w-suite-internal', False):
                QgsMessageLog.logMessage("SingleLayerExpressionAccessControlFilter for user %s: layer id %s does not exist!" % (QGS_SERVER.user, layer.id()), "", Qgis.Warning)
            return ""

        rule = ConstraintExpressionRule.get_rule_definition_for_user(QGS_SERVER.user, qdjango_layer.pk)
        if rule:
            QgsMessageLog.logMessage("SingleLayerExpressionAccessControlFilter rule for user %s and layer id %s: %s" % (QGS_SERVER.user, layer.id(), rule), "", Qgis.Info)

        return rule

    def cacheKey(self):
        """Return a cache key, a contant value means that the cache works
        normally and this filter does not influence the cache, an empty value
        (which is the default implementation) means that the cache is disabled"""

        # Return a constant: the cache is not influenced by this filter
        return "sle"


# Register the filter, keep a reference because of the garbage collector
ac_filter2 = SingleLayerExpressionAccessControlFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerAccessControl(ac_filter2, 9999)


class GeoConstraintAccessControlFilter(QgsAccessControlFilter):
    """A filter that sets an (geo)constraints filter from the layer (geo)constraints"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def layerFilterExpression(self, layer):
        """Retrieve and sets user layer constraints"""

        try:
            qdjango_layer = Layer.objects.get(project=QGS_SERVER.project, qgs_layer_id=layer.id())
        except Layer.DoesNotExist:
            # This is a special case for internal layers, we don't want to log this
            if not layer.customProperty('g3w-suite-internal', False):
                QgsMessageLog.logMessage("SingleLayerExpressionAccessControlFilter for user %s: layer id %s does not exist!" % (QGS_SERVER.user, layer.id()), "", Qgis.Warning)
            return ""

        rule = GeoConstraintRule.get_rule_definition_for_user(QGS_SERVER.user, qdjango_layer)
        if rule:
            QgsMessageLog.logMessage("SingleLayerExpressionAccessControlFilter rule for user %s and layer id %s: %s" % (QGS_SERVER.user, layer.id(), rule), "", Qgis.Info)

        return rule

    def cacheKey(self):
        """Return a cache key, a contant value means that the cache works
        normally and this filter does not influence the cache, an empty value
        (which is the default implementation) means that the cache is disabled"""

        # Return a constant: the cache is not influenced by this filter
        return "gc"


# Register the filter, keep a reference because of the garbage collector
ac_filter3 = GeoConstraintAccessControlFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerAccessControl(ac_filter3, 9997)