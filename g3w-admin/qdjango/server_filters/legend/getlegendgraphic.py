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
import json
import re

logger = logging.getLogger(__name__)


class GetLegendGraphicFilter(QgsServerFilter):
    """add ruleKey to GetLegendGraphic for categorized and rule-based
    only works for single LAYER and STYLE(S) and json format.
    """

    def __init__(self, server_iface):

        super().__init__(server_iface)
        self.server_iface = server_iface

    def responseComplete(self):

        handler = self.server_iface.requestHandler()

        if not handler:
            logger.critical(
                'GetLegendGraphicFilter plugin cannot be run in multithreading mode, skipping.')
            return

        params = handler.parameterMap()

        if 'FORMAT' in params and \
                params['FORMAT'] == 'application/json' and \
                'LAYER' in params and \
                'SERVICE' in params and \
                'REQUEST' in params and \
                params['SERVICE'].upper() == 'WMS' and \
                params['REQUEST'].upper() == 'GETLEGENDGRAPHIC':
            qgs_project = QGS_SERVER.project.qgis_project
            use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)
            layer_id = params['LAYER']

            style = params['STYLES'] if 'STYLES' in params else ''

            if not style:
                style = params['STYLE'] if 'STYLE' in params else ''

            current_style = ''
            layer = None

            try:
                layer = qgs_project.mapLayer(
                    layer_id) if use_ids else qgs_project.mapLayersByName(layer_id)[0]

                current_style = layer.styleManager().currentStyle()

                if current_style and style and style != current_style:
                    layer.styleManager().setCurrentStyle(style)

                renderer = layer.renderer()

                renderer_types = (
                    "categorizedSymbol",
                    "ruleBased",
                    "graduatedSymbol",
                    "graduatedSymbol",
                    "RuleRenderer"
                )

                if renderer.type() in renderer_types:
                    body = handler.body()
                    json_data = json.loads(bytes(body))
                    categories = {item.label(): {'ruleKey': item.ruleKey(), 'checked': renderer.legendSymbolItemChecked(
                        item.ruleKey())} for item in renderer.legendSymbolItems()}

                    symbols = json_data['nodes'][0]['symbols'] if 'symbols' in json_data['nodes'][0] else json_data['nodes']

                    new_symbols = []

                    for idx in range(len(symbols)):
                        symbol = symbols[idx]

                        # When 'SHOWFEATURECOUNT' parameter is present the symbol['title'] has at the end the count of features
                        # So we apply a regex to remove it
                        symbol['title'] = re.sub(r' \[\d+\]$', '', symbol['title'])
                        try:
                            category = categories[symbol['title']]
                            symbol['ruleKey'] = category['ruleKey']
                            symbol['checked'] = category['checked']
                        except Exception as e:
                            logger.debug(f'GETLEGENDGRAPHICS: Error getting ruleKey for symbol {symbol["title"]}: {e}')
                            pass

                        new_symbols.append(symbol)

                    if 'symbols' in json_data['nodes'][0]:
                        json_data['nodes'][0]['symbols'] = new_symbols
                    else:
                        json_data['nodes'] = new_symbols

                    handler.clearBody()
                    handler.appendBody(json.dumps(
                        json_data).encode('utf8'))
            except Exception as ex:
                logger.warning(
                    'Error getting layer "{}" when setting up legend graphic for json output when configuring OWS call: {}'.format(layer_id, str(ex)))
            finally:
                if layer and style and current_style and style != current_style:
                    layer.styleManager().setCurrentStyle(current_style)


legend_graphic_filter = GetLegendGraphicFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerFilter(legend_graphic_filter, 150)
