# coding=utf-8
"""" A plugin change the scale visibility of layers based on user and group

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-26'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'


from qgis.server import QgsServerFilter, QgsServerProjectUtils
from qdjango.apps import QGS_SERVER

import logging

logger = logging.getLogger(__name__)

class ScaleVisibilityLayerConstraintFilter(QgsServerFilter):

    def __init__(self, server_iface):

        super().__init__(server_iface)
        self.server_iface = server_iface

    def requestReady(self):

        handler = self.server_iface.requestHandler()

        # Create a restore data object for layers
        self.restore_ctx = {}

        if not handler:
            logger.critical('ScaleVisibilityLayerConstraintFilter plugin cannot be run in multithreading mode, skipping.')
            return

        params = handler.parameterMap()

        if 'LAYERS' not in params:
            return

        qgs_project = QGS_SERVER.project.qgis_project
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)


        layers = params['LAYERS'].split(',') if 'LAYERS' in params and params['LAYERS'] else []
        if len(layers) == 0:
            layers = [params['LAYER']] if 'LAYER' in params and params['LAYER'] else []



        svlc = QGS_SERVER.project.get_scalevisibilitylayerconstraint(user=QGS_SERVER.djrequest.user,use_ids=use_ids)

        if not svlc:
            return

        # Layer to scale visibility constraints
        layer_constraints = list(set(layers).intersection(set(svlc.keys())))


        for l in layer_constraints:
            qgs_layer = qgs_project.mapLayer(l) if use_ids else qgs_project.mapLayersByName(l)[0]


            # Set restore context for the layer
            self.restore_ctx[l] = {
                'minscale': qgs_layer.minimumScale(),
                'maxscale': qgs_layer.maximumScale(),
                'scale_based_visibility': qgs_layer.hasScaleBasedVisibility()
            }

            qgs_layer.setScaleBasedVisibility(True)
            qgs_layer.setMinimumScale(svlc[l].minscale)
            qgs_layer.setMaximumScale(svlc[l].maxscale)

    def responseComplete(self):
        """Restore customized scales"""

        if not self.restore_ctx:
            return

        qgs_project = QGS_SERVER.project.qgis_project
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)

        for l, v in self.restore_ctx.items():
            qgs_layer = qgs_project.mapLayer(l) if use_ids else qgs_project.mapLayersByName(l)[0]

            # Restore the layer scale visibility
            qgs_layer.setScaleBasedVisibility(v['scale_based_visibility'])
            qgs_layer.setMinimumScale(v['minscale'])
            qgs_layer.setMaximumScale(v['maxscale'])


svlc_filter = ScaleVisibilityLayerConstraintFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerFilter(svlc_filter, 120)