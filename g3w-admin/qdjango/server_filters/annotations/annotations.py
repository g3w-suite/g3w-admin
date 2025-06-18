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
import math
from urllib.parse import unquote_plus

from qgis.core import (
    Qgis,
    QgsProject,
    QgsVectorLayer,
    QgsFeature,
    QgsGeometry,
    QgsPointXY,
    QgsPalLayerSettings,
    QgsTextFormat,
    QgsTextBufferSettings,
    QgsVectorLayerSimpleLabeling,
    QgsMessageLog,
    QgsArrowSymbolLayer,
)

from qgis.server import (
    QgsServerFilter,
    QgsServerException,
    QgsServerProjectUtils
)

from qgis.PyQt.QtGui import QColor
from qgis.PyQt.QtCore import Qt, QTemporaryDir

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
        self.layer_number = 0

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

    def setLabeling(self, layer, geometry_type, style):
        """Set up labeling for the layer based on the geometry type and style."""

        color_str = style.get('color', 'rgb(0, 0, 0)')
        opacity = style.get('opacity', 1.0)
        width = style.get('width', 1)
        # For points only:
        radius = style.get('radius', 2)
        direction = style.get('direction', '')

        # Color to #XXXXX dec to hex
        if color_str.startswith('rgb'):
            color_str = color_str[4:-1].split(',')
            color_str = '#{:02x}{:02x}{:02x}'.format(int(color_str[0]), int(color_str[1]), int(color_str[2]))
        elif color_str.startswith('#'):
            color_str = color_str.strip()

        color = QColor(color_str)
        if not color.isValid():
            raise ValueError("Invalid color: {}".format(color_str))

        layer_settings  = QgsPalLayerSettings()
        layer_settings.priority = 10;
        layer_settings.placementSettings().setOverlapHandling( Qgis.LabelOverlapHandling.AllowOverlapIfRequired )
        layer_settings.placementSettings().setAllowDegradedPlacement( True )

        text_format = QgsTextFormat()
        text_format.setSizeUnit(Qgis.RenderUnit.Pixels)

        if geometry_type == 'Text':
            text_format.setSize(style.get('fontsize', 15))
        else:
            text_format.setSize(15)

        buffer_settings = QgsTextBufferSettings()
        buffer_settings.setEnabled(True)
        buffer_settings.setSize(5)
        buffer_settings.setSizeUnit(Qgis.RenderUnit.Pixels)
        buffer_settings.setColor(QColor("white"))

        text_format.setBuffer(buffer_settings)

        layer_settings.setFormat(text_format)
        layer_settings.fieldName = "name"

        layer_settings.multilineAlign = Qgis.LabelMultiLineAlignment.Center
        layer_settings.enabled = True

        if geometry_type == 'Text':
            layer.renderer().symbol().setOpacity(0.0)

        if geometry_type == 'Text':
            layer_settings.placement = Qgis.LabelPlacement.AroundPoint
            rotation_rad = style.get('rotation', 0)
            if rotation_rad:
                rotation_deg = rotation_rad / math.pi * 180
                layer_settings.angleOffset = rotation_deg
        elif geometry_type == 'Point':
            layer_settings.placement = Qgis.LabelPlacement.OverPoint
            layer_settings.pointSettings().setQuadrant( Qgis.LabelQuadrantPosition.Above )
            layer_settings.yOffset = -2
        elif geometry_type == 'LineString':
            layer_settings.placement = Qgis.LabelPlacement.Line
            layer_settings.lineSettings().setPlacementFlags( Qgis.LabelLinePlacementFlag.AboveLine | Qgis.LabelLinePlacementFlag.MapOrientation )
        elif geometry_type == 'Polygon':
            layer_settings.placement = Qgis.LabelPlacement.AroundPoint

        labeling = QgsVectorLayerSimpleLabeling(layer_settings)
        layer.setLabelsEnabled(True)
        layer.setLabeling(labeling)

        if geometry_type == 'Point':
            layer.renderer().symbol().symbolLayer(0).setStrokeColor(color)
            layer.renderer().symbol().symbolLayer(0).setSize(radius)
            layer.renderer().symbol().symbolLayer(0).setSizeUnit(Qgis.RenderUnit.Pixels)
            transparent_color = QColor(color)
            transparent_color.setAlphaF(opacity)
            assert transparent_color.isValid(), "Invalid transparent color"
            layer.renderer().symbol().symbolLayer(0).setFillColor(transparent_color)
        elif geometry_type == 'Polygon' or geometry_type == 'Circle':
            transparent_color = QColor(color)
            transparent_color.setAlphaF(opacity)
            assert transparent_color.isValid(), "Invalid transparent color"
            layer.renderer().symbol().symbolLayer(0).setFillColor(transparent_color)
            layer.renderer().symbol().symbolLayer(0).setStrokeColor(color)
            layer.renderer().symbol().symbolLayer(0).setStrokeWidth(width)
            layer.renderer().symbol().symbolLayer(0).setStrokeWidthUnit(Qgis.RenderUnit.Pixels)
        elif geometry_type == 'LineString':
            if direction in ['forward', 'backward']:
                properties = {
                    "is_repeated": True,
                    "is_curved" : False,
                    "arrow_width": width,
                    "arrow_width_unit": "Pixel",
                    "arrow_start_width": width,
                    "arrow_start_width_unit": "Pixel",
                    "head_thickness": width * 1.5,
                    "head_thickness_unit": "Pixel",
                    "head_length": width * 1.5 * 1.4142,
                    "head_length_unit": "Pixel",
                }
                if direction == 'backward':
                    properties['head_type'] = QgsArrowSymbolLayer.HeadType.HeadReversed
                arrow_symbol = QgsArrowSymbolLayer.create(properties)
                arrow_symbol.setStrokeColor(color)
                fill_symbol = arrow_symbol.subSymbol().symbolLayer(0)
                fill_symbol.setStrokeStyle(Qt.PenStyle.NoPen)
                fill_symbol.setStrokeWidth(0)
                layer.renderer().symbol().changeSymbolLayer(0, arrow_symbol)
            else:
                layer.renderer().symbol().setColor(color)
                layer.renderer().symbol().setWidth(width)
                layer.renderer().symbol().setWidthUnit(Qgis.RenderUnit.Pixels)


    def makeLayer(self, geometry_type, epsg_project):
        """
        Create a QgsVectorLayer for the given geometry type.
        """
        layer = None
        if geometry_type == 'Point':
            layer = QgsVectorLayer(f'Point?crs={epsg_project}&field=name:string', 'annotations_g3wsuite_internal_points_%s' % self.layer_number, 'memory')
        elif geometry_type == 'Text':
            layer = QgsVectorLayer(f'Point?crs={epsg_project}&field=name:string', 'annotations_g3wsuite_internal_text%s' % self.layer_number, 'memory')
        elif geometry_type == 'LineString':
            layer = QgsVectorLayer(f'LineString?crs={epsg_project}&field=name:string', 'annotations_g3wsuite_internal_lines_%s' % self.layer_number, 'memory')
        elif geometry_type == 'Polygon':
            layer = QgsVectorLayer(f'Polygon?crs={epsg_project}&field=name:string', 'annotations_g3wsuite_internal_polygons_%s' % self.layer_number, 'memory')
        elif geometry_type == 'Circle':
            layer = QgsVectorLayer(f'MultiSurface?crs={epsg_project}&field=name:string', 'annotations_g3wsuite_internal_polygons_%s' % self.layer_number, 'memory')
        else:
            raise ValueError("Unsupported geometry type: {}".format(geometry_type))

        self.layer_number += 1
        layer.setCustomProperty('g3w-suite-internal', True)
        return layer


    def onRequestReady(self):

        handler = self.server_iface.requestHandler()
        params = handler.parameterMap()
        self.original_project_path = None

        if not self.checkService(params):
            return True

        qgs_project = QGS_SERVER.project.qgis_project
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)
        epsg_project = qgs_project.crs().authid()

        self.layer_number = 0

        # Parse the JSON annotations
        annotations_data = unquote_plus(params['ANNOTATIONS'])

        # Load from file for testing
        if False:
            with open('qdjango/tests/data/annotations/annotations_with_style.json', 'r') as f:
                annotations_data = f.read()

        # Parse the annotations JSON
        try:
            annotations = json.loads(annotations_data)
        except json.JSONDecodeError:
            return self.error(handler, 'Invalid JSON format for ANNOTATIONS parameter')

        self.temp_dir = QTemporaryDir()

        QgsMessageLog.logMessage("AnnotationsPrintFilter layers initialized", 'annotationsprint', Qgis.Info)

        layers = []

        try:

            # Loop through the annotations and create one layer for each feature
            for annotation in annotations['features']:
                geom = annotation['geometry']
                coords = geom.get('coordinates', [])
                style = annotation['properties'].get('style', {})
                if geom['type'] == 'LineString':
                    layer = self.makeLayer('LineString', epsg_project)
                    feature = QgsFeature(layer.fields())
                    line = [QgsPointXY(coord[0], coord[1]) for coord in coords]
                    feature.setGeometry(QgsGeometry.fromPolylineXY(line))
                    feature.setAttribute('name', annotation['properties'].get('label', ''))
                    layer.dataProvider().addFeatures([feature])
                    self.setLabeling(layer, 'LineString', style)
                    layers.append(layer)
                elif geom['type'] == 'Point':
                    layer = self.makeLayer('Point', epsg_project)
                    feature = QgsFeature(layer.fields())
                    feature.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(coords[0], coords[1])))
                    feature.setAttribute('name', annotation['properties'].get('label', ''))
                    layer.dataProvider().addFeatures([feature])
                    self.setLabeling(layer,  annotation['properties'].get('type', 'Point'), style)
                    layers.append(layer)
                elif geom['type'] == 'Polygon':
                    layer = self.makeLayer('Polygon', epsg_project)
                    feature = QgsFeature(layer.fields())
                    polygon = [QgsPointXY(coord[0], coord[1]) for coord in coords[0]]
                    feature.setGeometry(QgsGeometry.fromPolygonXY([polygon]))
                    feature.setAttribute('name', annotation['properties'].get('label', ''))
                    layer.dataProvider().addFeatures([feature])
                    self.setLabeling(layer, 'Polygon', style)
                    layers.append(layer)
                elif geom['type'] == 'GeometryCollection':  # Circle
                    layer = self.makeLayer('Circle', epsg_project)
                    feature = QgsFeature(layer.fields())
                    center = annotation['properties'].get('center', [0, 0])
                    center_xy = QgsPointXY(center[0], center[1])
                    radius = annotation['properties'].get('radius', 0)
                    # find three points on the circle
                    points = []
                    for angle in [0, 90, 180, 270, 360]:
                        rad = angle * (3.14159 / 180.0)
                        x = center_xy.x() + radius * math.cos(rad)
                        y = center_xy.y() + radius * math.sin(rad)
                        points.append(QgsPointXY(x, y))

                    feature.setGeometry(QgsGeometry.fromWkt('CURVEPOLYGON(CIRCULARSTRING(' + ', '.join(['{} {}'.format(p.x(), p.y()) for p in points]) + '))'))
                    feature.setAttribute('name', annotation['properties'].get('label', ''))
                    layer.dataProvider().addFeatures([feature])
                    self.setLabeling(layer, 'Circle', style)
                    layers.append(layer)

                    # Check if we have a label_radius and add a linestring layer
                    label_radius = annotation['properties'].get('label_radius', '')
                    if label_radius:
                        layer = self.makeLayer('LineString', epsg_project)
                        feature = QgsFeature(layer.fields())

                        point_on_circle = annotation['properties'].get('endCoordinates', [0, 0])
                        point_on_circle_xy = QgsPointXY(point_on_circle[0], point_on_circle[1])
                        line = [center_xy, point_on_circle_xy]
                        feature.setGeometry(QgsGeometry.fromPolylineXY(line))
                        feature.setAttribute('name', annotation['properties'].get('label_radius', ''))
                        layer.dataProvider().addFeatures([feature])
                        self.setLabeling(layer, 'LineString', style)
                        layers.append(layer)

                    # Check if we have a label_angle and add a point (text-only) layer
                    label_angle = annotation['properties'].get('label_angle', '')
                    if label_angle:
                        layer = self.makeLayer('Text', epsg_project)
                        feature = QgsFeature(layer.fields())
                        point_on_circle = annotation['properties'].get('endCoordinates', [0, 0])
                        point_on_circle_xy = QgsPointXY(point_on_circle[0], point_on_circle[1])
                        feature.setGeometry(QgsGeometry.fromPointXY(point_on_circle_xy))
                        feature.setAttribute('name', label_angle)
                        layer.dataProvider().addFeatures([feature])
                        # Empty style or we get the circle color
                        self.setLabeling(layer, 'Text', {})
                        layers.append(layer)

            # Make a temporary copy of the project to avoid modifying the original
            self.temp_project_path = self.temp_dir.path() + '/temp_getprint_annotation_project.qgs'

            qgs_project = QgsProject.instance()
            self.original_project_path = qgs_project.fileName()
            qgs_project.setFileName(self.temp_project_path)
            if not qgs_project.write():
                self.error(handler, 'Error writing temporary project file')
                return True

            # Add the layers to the project
            for layer in layers:
                if not layer.isValid():
                    self.error(handler, 'Invalid layer: {}'.format(layer.name()))
                    return True
                qgs_project.addMapLayer(layer, False)

            qgs_project.write()

            QgsMessageLog.logMessage("AnnotationsPrintFilter layers labeling setup", 'annotationsprint', Qgis.Info)

            # Get the print output for each MAPn parameter
            layers_param = [k for k in handler.parameterMap().keys() if k.upper().endswith(':LAYERS')]
            if handler.parameter('LAYERS'):
                layers_param.append('LAYERS')

            for param in layers_param:
                # Get the layers parameter, URI encoded
                original_layers = handler.parameter(param)
                # Add the annotation layer to the layers parameter, URI encoded
                for layer in layers:
                    lay_to_add = layer.id() if use_ids else layer.name()
                    if layers == '':
                        original_layers = lay_to_add
                    else:
                        original_layers = original_layers + ',' + lay_to_add
                handler.setParameter(param, original_layers)

        except Exception as e:
            # Get exception line
            return self.error(handler, 'Error creating layers: {}'.format(e))

        return True


    def onResponseComplete(self):

        handler = self.server_iface.requestHandler()

        if not handler:
            return True

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
