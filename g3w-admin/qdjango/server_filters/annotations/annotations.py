# coding=utf-8
""""Print temporary annotations for QGIS Server

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2025-04-23'
__copyright__ = 'Copyright 2025, ItOpen'


import json
from urllib.parse import unquote_plus

from qgis.core import (
    Qgis,
    QgsProject,
    QgsVectorLayer,
    QgsField,
    QgsFeature,
    QgsGeometry,
    QgsPointXY,
    QgsPalLayerSettings,
    QgsTextFormat,
    QgsTextBufferSettings,
    QgsVectorLayerSimpleLabeling,
    QgsSymbol,
    QgsMarkerSymbol,
    QgsLineSymbol,
    QgsFillSymbol,
    QgsMessageLog,
)

from qgis.server import (
    QgsServerRequest,
    QgsServerResponse,
    QgsServerFilter,
    QgsServerException,
)

from qgis.PyQt.QtGui import QFont, QColor
from qgis.PyQt.QtCore import QTemporaryDir

from qdjango.apps import QGS_SERVER, remove_project_from_cache


class AnnotationsPrintFilter(QgsServerFilter):
    """
    Filter to add a new request to print a specific atlas feature
    """

    def __init__(self, server_iface):
        super(AnnotationsPrintFilter, self).__init__(server_iface)
        self.server_iface = server_iface
        QgsMessageLog.logMessage("AnnotationsPrintFilter init", 'annotationsprint', Qgis.Info)
        self.temp_dir = None
        self.original_project_path = None
        self.temp_project_path = None

    def error(self, handler, message):
        """
        Send an error message to the client
        """
        out_message = "AnnotationsPrintFilter error: %s" % message
        QgsMessageLog.logMessage(out_message, 'annotationsprint', Qgis.Info)
        handler.setServiceException(
            QgsServerException(out_message, 400))
        return True

    def checkService(self, params):
        # Check if the service is WMS
        if 'SERVICE' not in params or params['SERVICE'].lower() != 'wms':
            return False

        # Check if the request is for annotations
        if 'REQUEST' not in params or params['REQUEST'].lower() != 'getprint':
            return False

        # Check if the request has annotations
        if 'ANNOTATIONS' not in params:
            return False

        return True

    def onRequestReady(self):
        handler = self.server_iface.requestHandler()
        params = handler.parameterMap()

        if not self.checkService(params):
            return True

        # Parse the JSON annotations
        annotations_data = unquote_plus(params['ANNOTATIONS'])

        # Parse the annotations JSON
        try:
            annotations = json.loads(annotations_data)
        except json.JSONDecodeError:
            return self.error(handler, 'Invalid JSON format for ANNOTATIONS parameter')

        self.temp_dir = QTemporaryDir()

        # Load the annotations into three QgsVectorLayer objects, one for each type
        # of annotation (point, line, polygon), plus the hidden labels layer
        annotation_points = QgsVectorLayer('Point?crs=EPSG:4326&field=name:string', 'annotations_g3wsuite_internal_points', 'memory')
        annotation_points.setCustomProperty('g3w-suite-internal', True)
        annotation_lines = QgsVectorLayer('LineString?crs=EPSG:4326&field=name:string', 'annotations_g3wsuite_internal_lines', 'memory')
        annotation_lines.setCustomProperty('g3w-suite-internal', True)
        annotation_polygons = QgsVectorLayer('Polygon?crs=EPSG:4326&field=name:string', 'annotations_g3wsuite_internal_polygons', 'memory')
        annotation_polygons.setCustomProperty('g3w-suite-internal', True)
        annotation_labels = QgsVectorLayer('Point?crs=EPSG:4326&field=name:string', 'annotations_g3wsuite_internal_labels', 'memory')
        annotation_labels.setCustomProperty('g3w-suite-internal', True)


        assert annotation_points.isValid()
        assert annotation_lines.isValid()
        assert annotation_polygons.isValid()
        assert annotation_labels.isValid()

        layers = [annotation_points, annotation_lines, annotation_polygons, annotation_labels]

        QgsMessageLog.logMessage("AnnotationsPrintFilter layers initialized", 'annotationsprint', Qgis.Info)

        # Default styles
        styles = {
            'points': {
                'stroke-color': '#FF0000',
                'stroke-width': 2,
                'fill-color': '#FF0000',
                'size': 5,
                'font-color': '#FF0000',
                'font-size': 12,
                'font-style': 'normal',
            },
            'labels': {
                'font-color': '#FF0000',
                'font-size': 12,
                'font-style': 'normal',
                'buffer-size': 1,
                'buffer-color': '#FFFFFF',
            },
            'lines': {
                'stroke-color': '#00FF00',
                'stroke-width': 2,
                'font-color': '#00FF00',
                'font-size': 12,
                'font-style': 'normal',
                'buffer-size': 1,
                'buffer-color': '#FFFFFF'
            },
            'polygons': {
                'stroke-color': '#0000FF',
                'stroke-width': 2,
                'fill-color': '#0000FF',
                'font-size': 12,
                'font-style': 'normal',
                'buffer-size': 1,
                'buffer-color': '#FFFFFF'
            },
        }

        if 'styles' in annotations:
            # Override the default styles with the ones provided in the annotations
            styles = annotations['styles']

        for layer in layers:
            layer.startEditing()

        # Load the JSON annotations into the layers
        for annotation in annotations['features']:
            geom = annotation['geometry']
            coords = geom['coordinates']
            if geom['type'] == 'LineString':
                feature = QgsFeature(annotation_lines.fields())
                line = [QgsPointXY(coord[0], coord[1]) for coord in coords]
                feature.setGeometry(QgsGeometry.fromPolylineXY(line))
                feature.setAttribute('name', annotation['properties']['name'])
                annotation_lines.addFeatures([feature])
            elif geom['type'] == 'Point':
                feature = QgsFeature(annotation_points.fields())
                feature.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(coords[0], coords[1])))
                feature.setAttribute('name', annotation['properties']['name'])
                if 'label' in annotation['properties']:
                    annotation_labels.addFeatures([feature])
                else:
                    annotation_points.addFeatures([feature])
            elif geom['type'] == 'Polygon':
                feature = QgsFeature(annotation_polygons.fields())
                polygon = [QgsPointXY(coord[0], coord[1]) for coord in coords[0]]
                feature.setGeometry(QgsGeometry.fromPolygonXY([polygon]))
                feature.setAttribute('name', annotation['properties']['name'])
                annotation_polygons.addFeatures([feature])

        for layer in layers:
            layer.commitChanges()

        # Set the styles for the layers

        # Points
        if 'size' in styles['points']:
            annotation_points.renderer().symbol().setSize(styles['points']['size'])

        if 'stroke-color' in styles['points']:
            color = QColor(styles['points']['stroke-color'])
            if not color.isValid():
                self.error(handler, 'Invalid color: {}'.format(styles['points']['stroke-color']))
                return True
            annotation_points.renderer().symbol().symbolLayer(0).setStrokeColor(color)

        if 'stroke-width' in styles['points']:
            annotation_points.renderer().symbol().symbolLayer(0).setStrokeWidth(styles['points']['stroke-width'])

        if 'fill-color' in styles['points']:
            color = QColor(styles['points']['fill-color'])
            if not color.isValid():
                self.error(handler, 'Invalid color: {}'.format(styles['points']['fill-color']))
                return True
            annotation_points.renderer().symbol().setColor(color)

        # Lines
        if 'stroke-color' in styles['lines']:
            color = QColor(styles['lines']['stroke-color'])
            if not color.isValid():
                self.error(handler, 'Invalid color: {}'.format(styles['lines']['stroke-color']))
                return True
            annotation_lines.renderer().symbol().setColor(color)

        if 'stroke-width' in styles['lines']:
            annotation_lines.renderer().symbol().setWidth(styles['lines']['stroke-width'])

        # Polygons
        if 'stroke-color' in styles['polygons']:
            color = QColor(styles['polygons']['stroke-color'])
            if not color.isValid():
                self.error(handler, 'Invalid color: {}'.format(styles['polygons']['stroke-color']))
                return True
            annotation_polygons.renderer().symbol().symbolLayer(0).setStrokeColor(color)

        if 'stroke-width' in styles['polygons']:
            annotation_polygons.renderer().symbol().symbolLayer(0).setStrokeWidth(styles['polygons']['stroke-width'])

        if 'fill-color' in styles['polygons']:
            color = QColor(styles['polygons']['fill-color'])
            if not color.isValid():
                self.error(handler, 'Invalid color: {}'.format(styles['polygons']['fill-color']))
                return True
            annotation_polygons.renderer().symbol().symbolLayer(0).setFillColor(color)

        # Set the base labeling and text format
        layer_settings  = QgsPalLayerSettings()
        layer_settings.priority = 10;
        layer_settings.placementSettings().setOverlapHandling( Qgis.LabelOverlapHandling.AllowOverlapIfRequired )
        layer_settings.placementSettings().setAllowDegradedPlacement( True )

        text_format = QgsTextFormat()
        text_format.setSize(12)

        buffer_settings = QgsTextBufferSettings()
        buffer_settings.setEnabled(True)
        buffer_settings.setSize(1)
        buffer_settings.setColor(QColor("white"))

        text_format.setBuffer(buffer_settings)

        layer_settings.setFormat(text_format)
        layer_settings.fieldName = "name"

        # layer_settings.placement = Qgis.LabelPlacement.OrderedPositionsAroundPoint
        layer_settings.enabled = True

        labeling = {}

        try:

            # Override font size weight style and color for each layer
            for layer_type in ['points', 'lines', 'polygons', 'labels']:
                if layer_type not in styles:
                    continue
                if 'font-size' in styles[layer_type]:
                    text_format.setSize(styles[layer_type]['font-size'])
                if 'font-color' in styles[layer_type]:
                    color = QColor(styles[layer_type]['font-color'])
                    if not color.isValid():
                        self.error(handler, 'Invalid color: {}'.format(styles[layer_type]['font-color']))
                        return True
                    text_format.setColor(color)
                if 'font-style' in styles[layer_type]:
                    text_format.setNamedStyle(styles[layer_type]['font-style'])

                layer_settings.setFormat(text_format)

                if layer_type in ['points', 'labels']:
                    layer_settings.placement = Qgis.LabelPlacement.AroundPoint
                elif layer_type == 'lines':
                    layer_settings.placement = Qgis.LabelPlacement.Line
                    layer_settings.lineSettings().setPlacementFlags( Qgis.LabelLinePlacementFlag.AboveLine | Qgis.LabelLinePlacementFlag.MapOrientation )
                elif layer_type == 'polygons':
                    layer_settings.placement = Qgis.LabelPlacement.AroundPoint

                labeling[layer_type] = QgsVectorLayerSimpleLabeling(layer_settings)

        except Exception as e:
            self.error(handler, 'Error setting styles: {}'.format(e))
            return True

        # Set the styles for the labels layer
        annotation_labels.setLabelsEnabled(True)
        annotation_labels.setLabeling(labeling['labels'])

        # No symbol for labels
        annotation_labels.renderer().symbol().setOpacity(0.0)

        # Set the styles for the points layer
        annotation_points.setLabelsEnabled(True)
        annotation_points.setLabeling(labeling['points'])

        # Set the styles for the lines layer
        annotation_lines.setLabelsEnabled(True)
        annotation_lines.setLabeling(labeling['lines'])

        # Set the styles for the polygons layer
        annotation_polygons.setLabelsEnabled(True)
        annotation_polygons.setLabeling(labeling['polygons'])

        # Make a temporary copy of the project to avoid modifying the original
        self.temp_project_path = self.temp_dir.path() + '/temp_getprint_annotation_project.qgs'

        qgs_project = QgsProject.instance()
        self.original_project_path = qgs_project.fileName()
        qgs_project.setFileName(self.temp_project_path)
        if not qgs_project.write():
            self.error(handler, 'Error writing temporary project file')
            return True

        # Add the layers to the project
        qgs_project.addMapLayer(annotation_points, False)
        qgs_project.addMapLayer(annotation_lines, False)
        qgs_project.addMapLayer(annotation_polygons, False)
        qgs_project.addMapLayer(annotation_labels, False)
        qgs_project.write()

        QgsMessageLog.logMessage("AnnotationsPrintFilter layers labeling setup", 'annotationsprint', Qgis.Info)

        # Get the print output
        layers = handler.parameter('LAYERS')
        # Add the annotation layer to the layers parameter, URI encoded
        for layer in [annotation_points, annotation_lines, annotation_polygons, annotation_labels]:
            if layers == '':
                layers = layer.name()
            else:
                layers = layers + ',' + layer.name()

        handler.setParameter('LAYERS', layers)
        return True

    def onResponseComplete(self):

        handler = self.server_iface.requestHandler()
        params = handler.parameterMap()

        if not self.checkService(params):
            return True

        # Remove the temporary project from the cache
        QgsMessageLog.logMessage("AnnotationsPrintFilter project path: %s" % QgsProject.instance().fileName(), 'annotationsprint', Qgis.Info)
        if self.original_project_path is not None:
            remove_project_from_cache(self.original_project_path)
        if self.temp_project_path is not None:
            remove_project_from_cache(self.temp_project_path)

        return True


# Register the filter, keep a reference because of the garbage collector
annotations_filter = AnnotationsPrintFilter(QGS_SERVER.serverInterface())
# Note: this should be the last filter, set the priority to 10000
QGS_SERVER.serverInterface(). registerFilter(annotations_filter, 10000)
