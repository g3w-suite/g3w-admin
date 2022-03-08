# coding=utf-8
"""" Management class for raster layer metadata

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-03-01'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


class MetadataRasterLayer(object):
    """
    Object to manage metadata QGIS raster layer
    """

    def get_layer_by_params(self, params):

        layer_id = params['layer_name']
        project_id = params['project_id']

        # get layer object from qdjango model layer
        return self._layer_model.objects.get(project_id=project_id, qgs_layer_id=layer_id)

    def __init__(self, qgis_layer, client_var, **kwargs):
        """Constructor

        :param qgis_layer: the QGIS vector layer
        :type qgis_layer: QgsVectorLayer
        :param client_var: layer original name
        :type client_var: str
        """
        self.qgis_layer = qgis_layer
        # TODO: change with raster type?
        #self.geometry_type = QgsWkbTypes.displayString(qgis_layer.wkbType())
        self.client_var = client_var

        for k, v in list(kwargs.items()):
            setattr(self, k, v)
