# coding=utf-8
""""Single layer constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-15'
__copyright__ = 'Copyright 2020, ItOpen'


from qgis.server import QgsAccessControlFilter
from qgis.core import QgsMessageLog, Qgis
from qdjango.apps import QGS_SERVER
from qdjango.models import ConstraintSubsetStringRule, ConstraintExpressionRule

class SingleLayerSubsetStringAccessControlFilter(QgsAccessControlFilter):
    """A filter that sets a subset string from the layer constraints"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def layerFilterSubsetString(self, layer):
        """Retrieve and sets user layer constraints"""

        rule = ConstraintSubsetStringRule.get_rule_definition_for_user(QGS_SERVER.user, layer.id())
        QgsMessageLog.logMessage("SingleLayerSubsetStringAccessControlFilter rule for user %s and layer id %s: %s" % (QGS_SERVER.user, layer.id(), rule), "", Qgis.Info)
        return rule



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

        rule = ConstraintExpressionRule.get_rule_definition_for_user(QGS_SERVER.user, layer.id())
        QgsMessageLog.logMessage("SingleLayerExpressionAccessControlFilter rule for user %s and layer id %s: %s" % (QGS_SERVER.user, layer.id(), rule), "", Qgis.Info)
        return rule


# Register the filter, keep a reference because of the garbage collector
ac_filter2 = SingleLayerExpressionAccessControlFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerAccessControl(ac_filter2, 9999)
