# coding=utf-8
""""Add reserved labels for print layouts.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2026-03-12 14:50:30'
__copyright__ = 'Copyright Gis3w'


from qdjango.apps import QGS_SERVER
from qgis.core import (
    Qgis,
    QgsMessageLog,
)

from qgis.server import (
    QgsServerFilter,
)

# Reserved QGIS print layout labels
RESERVED_PRINT_LAYOUT_LABELS = [
    'g3w_username', # Reserved for the username of the logged in user
    'g3w_user_email' # Reserved for the email of the logged in user
]

class ReservedLabelsPrintFilter(QgsServerFilter):
    """
    Filter to add a new request to print
    """

    def __init__(self, server_iface):
        super(ReservedLabelsPrintFilter, self).__init__(server_iface)
        self.server_iface = server_iface
        QgsMessageLog.logMessage("ReservedLabelsPrintFilter init", 'reservedlabelsprint', Qgis.Info)

    def requestReady(self):
        handler = self.server_iface.requestHandler()
        params = handler.parameterMap()

        service = params.get('SERVICE')
        if not service:
            return

        if service.lower() != 'wms':
            return

        # Check request to change atlas one
        if 'REQUEST' not in params or params['REQUEST'].lower() != 'getprint':
            return
        
        # Set the reserved labels values
        for label in RESERVED_PRINT_LAYOUT_LABELS:
            if label == 'g3w_username':
                try:
                    handler.setParameter(label, QGS_SERVER.user.username)
                except Exception as e:
                    QgsMessageLog.logMessage(f"Error setting parameter {label}: {e}", 'reservedlabelsprint', Qgis.Warning)
            elif label == 'g3w_user_email':
                try:
                    handler.setParameter(label, QGS_SERVER.user.email)
                except Exception as e:
                    QgsMessageLog.logMessage(f"Error setting parameter {label}: {e}", 'reservedlabelsprint', Qgis.Warning)

# Register the filter, keep a reference because of the garbage collector
reserved_labels_print_filter = ReservedLabelsPrintFilter(QGS_SERVER.serverInterface())
# Note: this should be the last filter, set the priority to 10000
QGS_SERVER.serverInterface().registerFilter(reserved_labels_print_filter, 54)