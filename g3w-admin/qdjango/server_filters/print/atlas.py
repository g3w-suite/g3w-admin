"""
***************************************************************************
    QGIS Server Plugin Filters: Add a new request to print a specific atlas
    feature
    ---------------------
    Date                 : October 2017
    Copyright            : (C) 2017 by Michaël Douchin - 3Liz
    Email                : mdouchin at 3liz dot com

    Modified by          : Walter Lorenzetti, Gis3W, lorenzetti at gis3w dot it
***************************************************************************
*                                                                         *
*   This program is free software; you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation; either version 2 of the License, or     *
*   (at your option) any later version.                                   *
*                                                                         *
***************************************************************************
"""

from qgis.server import QgsServerFilter
from qgis.core import Qgis, QgsMessageLog
from qdjango.apps import QGS_SERVER

import logging

logger = logging.getLogger('atlas_server_plugin')


class AtlasPrintFilter(QgsServerFilter):

    def __init__(self, server_iface):
        QgsMessageLog.logMessage('atlasprintFilter.init', 'atlasprint', Qgis.Info)
        super(AtlasPrintFilter, self).__init__(server_iface)

        self.server_iface = server_iface

        QgsMessageLog.logMessage("atlasprintFilter end init", 'atlasprint', Qgis.Info)

    def requestReady(self):
        handler = self.server_iface.requestHandler()
        params = handler.parameterMap()

        service = params.get('SERVICE')
        if not service:
            return

        if service.lower() != 'wms':
            return

        # Check request to change atlas one
        if 'REQUEST' not in params or params['REQUEST'].lower() not in ['getprintatlas', 'getcapabilitiesatlas']:
            return

        request = params['REQUEST'].lower()

        handler.setParameter('SERVICE', 'ATLAS')
        handler.setParameter('VERSION', '1.0.0')

        if request == 'getcapabilitiesatlas':
            handler.setParameter('REQUEST', 'GetCapabilities')
        elif request == 'getprintatlas':
            handler.setParameter('REQUEST', 'GetPrint')


# Register the filter, keep a reference because of the garbage collector
altas_filter = AtlasPrintFilter(QGS_SERVER.serverInterface())
# Note: this should be the last filter, set the priority to 10000
QGS_SERVER.serverInterface().registerFilter(altas_filter, 50)