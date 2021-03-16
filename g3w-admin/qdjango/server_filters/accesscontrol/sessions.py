# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-12-30'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from qgis.server import QgsAccessControlFilter
from qgis.core import QgsMessageLog, Qgis
from qdjango.apps import QGS_SERVER
from qdjango.models import SessionTokenFilter, Layer


class SingleLayerSessionTokenAccessControlFilter(QgsAccessControlFilter):
    """A filter that sets an expression filter from the layer session filter token"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def layerFilterExpression(self, layer):
        """Retrieve and sets user layer constraints"""

        try:
            qdjango_layer = Layer.objects.get(project=QGS_SERVER.project, qgs_layer_id=layer.id())
        except Layer.DoesNotExist:
            return ""

        # check for filtertoken
        request_data = QGS_SERVER.djrequest.POST if QGS_SERVER.djrequest.method == 'POST' \
            else QGS_SERVER.djrequest.GET

        filtertoken = request_data.get('filtertoken')
        if not filtertoken:
            return ""

        rule = SessionTokenFilter.get_expr_for_token(filtertoken, qdjango_layer)
        QgsMessageLog.logMessage("SingleLayerSessionTokenAccessControlFilter expression for filtertoken %s layer id %s: %s" % (filtertoken, layer.id(), rule), "", Qgis.Info)
        return rule

    def cacheKey(self):
        """Return a cache key, a contant value means that the cache works
        normally and this filter does not influence the cache, an empty value
        (which is the default implementation) means that the cache is disabled"""

        # Return a constant: the cache is not influenced by this filter
        return "slt"

# Register the filter, keep a reference because of the garbage collector
ac_filter3 = SingleLayerSessionTokenAccessControlFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerAccessControl(ac_filter3, 9998)
