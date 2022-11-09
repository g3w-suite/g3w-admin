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
from qgis.core import Qgis, QgsMessageLog, QgsMapLayerStyle
from qdjango.apps import QGS_SERVER

import logging

logger = logging.getLogger(__name__)


class LegendOnOffFilter(QgsServerFilter):
    """Legend ON/OFF filter

    LEGEND_ON=<layer_id>:<rule_key>,<rule_key>;<layer_id>:<rule_key>,<rule_key>
    LEGEND_OFF=<layer_id>:<rule_key>,<rule_key>;<layer_id>:<rule_key>,<rule_key>

    """

    def __init__(self, server_iface):

        super().__init__(server_iface)
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
                    try:
                        layer = qgs_project.mapLayer(layer_id)
                        if not layer:
                            layer = qgs_project.mapLayersByName(layer_id)[0]

                        if not layer_id in self.renderers_config:
                            sm = layer.styleManager()
                            current_style = sm.currentStyle()
                            try:
                                style_name = self.style_map[layer_id]
                            except KeyError:
                                style_name = current_style
                            xml = sm.style(style_name).xmlData()
                            sm.setCurrentStyle(style_name)
                            self.renderers_config[layer_id] = {
                                'current_style': current_style,
                                'xml': xml,
                                'style_name': style_name,
                            }

                        for key in key_list.split(','):
                            layer.renderer().checkLegendSymbolItem(key, onoff)

                    except Exception as ex:
                        logger.warning(
                            'Error setting legend {} for layer "{}" when configuring OWS call: {}'.format('ON' if onoff else 'OFF', layer_id, ex))
                        continue

    def requestReady(self):

        self.renderers_config = {}

        handler = self.server_iface.requestHandler()

        if not handler:
            logger.critical('LegendOnOffFilter plugin cannot be run in multithreading mode, skipping.')
            return

        params = handler.parameterMap()

        if 'LEGEND_ON' not in params and 'LEGEND_OFF' not in params:
            return

        styles = params['STYLES'].split(',') if 'STYLES' in params and params['STYLES'] else []

        if len(styles) == 0:
            styles = [params['STYLE']] if 'STYLE' in params and params['STYLE'] else []

        layers = params['LAYERS'].split(',') if 'LAYERS' in params and params['LAYERS'] else []

        if len(layers) == 0:
            layers = [params['LAYER']] if 'LAYER' in params and params['LAYER'] else []

        try:
            self.style_map = dict(zip(layers, styles))
        except Exception:
            self.style_map = {}

        if 'LEGEND_ON' in params:
            self._setup_legend(params['LEGEND_ON'], True)
        if 'LEGEND_OFF' in params:
            self._setup_legend(params['LEGEND_OFF'], False)


    def responseComplete(self):
        """Restore legend customized renderers"""

        handler = self.server_iface.requestHandler()

        if not handler:
            logger.critical(
                'LegendOnOffFilter plugin cannot be run in multithreading mode, skipping.')
            return

        if len(self.renderers_config) == 0:
            return

        qgs_project = QGS_SERVER.project.qgis_project
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)

        if len(self.renderers_config):
            for layer_id, renderer_config in self.renderers_config.items():
                try:
                    layer = qgs_project.mapLayer(layer_id)
                    if not layer:
                        layer = qgs_project.mapLayersByName(layer_id)[0]

                    config = self.renderers_config[layer_id]

                    sm = layer.styleManager()
                    sm.renameStyle(config['style_name'], 'dirty_to_remove')
                    sm.addStyle(config['style_name'], QgsMapLayerStyle( config['xml'] ))
                    sm.setCurrentStyle(config['current_style'])
                    sm.removeStyle('dirty_to_remove')

                except Exception as ex:
                    logger.warning(
                                'Error restoring renderer after legend ON/OFF for layer "{}" when configuring OWS call: {}'.format(layer_id, ex))
                    continue


legend_onoff_filter = LegendOnOffFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerFilter(legend_onoff_filter, 50)
