"""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-10-27'
__copyright__ = 'Copyright 2022, Gis3w'



from qgis.server import QgsServerFilter, QgsServerProjectUtils
from qgis.core import Qgis, QgsMessageLog
from qdjango.apps import QGS_SERVER

import logging

logger = logging.getLogger(__name__)


class LegendOnOffFilter(QgsServerFilter):
    """Legend ON/OFF filter

    LEGEND_ON=<layer_id>:<rule_key>,<rule_key>;<layer_id>:<rule_key>,<rule_key>
    LEGEND_OFF=<layer_id>:<rule_key>,<rule_key>;<layer_id>:<rule_key>,<rule_key>

    """

    def __init__(self, server_iface):

        super(LegendOnOffFilter, self).__init__(server_iface)
        self.server_iface = server_iface

    def _setup_legend(self, qs, onoff):

        if not qs or not ':' in qs:
                return

        qgs_project = QGS_SERVER.project.qgis_project
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)

        for legend_layer in qs.split(';'):
            layer_id, key_list = legend_layer.split(':')
            if layer_id != '' and key_list != '':
                keys = key_list.split(',')
                if len(keys) > 0:
                    if not layer_id in self.renderers.keys():
                        try:
                            layer = qgs_project.mapLayer(layer_id) if use_ids else qgs_project.mapLayersByName(layer_id)[0]
                            self.renderers[layer_id] = layer.renderer().clone()
                            for key in key_list.split(','):
                                layer.renderer().checkLegendSymbolItem(key, onoff)
                        except:
                            logger.warning(
                                'Error setting legend {} for layer "{}" when configuring OWS call'.format('ON' if onoff else 'OFF', layer_id))
                            continue

    def requestReady(self):
        handler = self.server_iface.requestHandler()
        params = handler.parameterMap()
        self.renderers = {}
        if 'LEGEND_ON' in params:
            self._setup_legend(params['LEGEND_ON'], True)
        if 'LEGEND_OFF' in params:
            self._setup_legend(params['LEGEND_OFF'], False)


    def responseComplete(self):
        """Restore legend customized renderers"""

        qgs_project = QGS_SERVER.project.qgis_project
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)

        if len(self.renderers):
            for layer_id, renderer in self.renderers.items():
                try:
                    layer = qgs_project.mapLayer(layer_id) if use_ids else qgs_project.mapLayersByName(layer_id)[0]
                    layer.setRenderer(renderer)
                except:
                    logger.warning(
                                'Error restoring renderer after legend ON/OFF for layer "{}" when configuring OWS call'.format(layer_id))
                    continue

            self.renderers = None

legend_filter = LegendOnOffFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerFilter(legend_filter, 50)