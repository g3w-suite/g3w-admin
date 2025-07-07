# coding=utf-8
""""Wrapper fo Data Plotly plot_factory module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qgis.PyQt.QtXml import QDomDocument
from qplotly.vendor.DataPlotly.core.plot_factory import (
    PlotFactory,
    QgsExpressionContext,
    QgsExpressionContextUtils,
    QgsExpression,
    QgsFeatureRequest,
    PlotSettings,
    QgsCoordinateTransform,
    QgsProject,
    QgsCsException,
    QgsGeometry,
    NULL,
    QColor,
    QgsSymbolLayerUtils
)

from qplotly.server_filters import ByFatherFeatursFilter

from core.api.filters import IntersectsBBoxFilter
from core.api.base.vector import MetadataVectorLayer

from qdjango.api.layers.filters import (
    SingleLayerSessionTokenFilter,
    RelationOneToManyFilter,
    ColumnAclFilter,
)

from qdjango.api.constraints.filters import (
    SingleLayerSubsetStringConstraintFilter,
    SingleLayerExpressionConstraintFilter,
    GeoConstraintsFilter,
)

from qgis.PyQt.QtCore import (
    QDate,
    QDateTime,
    QTime
)


class QplotlyFactoring(PlotFactory):

    filter_backends = (
        IntersectsBBoxFilter,
        SingleLayerSubsetStringConstraintFilter,
        SingleLayerExpressionConstraintFilter,
        SingleLayerSessionTokenFilter,
        GeoConstraintsFilter,
        RelationOneToManyFilter,
        ColumnAclFilter,
    )

    def __init__(self, *args, **kwargs):

        self.djrequest = kwargs['request']
        del(kwargs['request'])

        self.layer = kwargs['layer']

        del (kwargs['layer'])

        # set data have to reproject
        self.set_reprojecting_status()

        super().__init__(*args, **kwargs)

    def set_reprojecting_status(self):
        """
        Check if data have to reproject
        :return:
        """
        # check if data to reproject
        # FIXME: use QgsProject crs(), can be (in a try/except block):
        # self.layer.project.qgis_project.crs() != self.layer.qgis_layer.crs()
        if self.layer:
            self.reproject = not self.layer.project.group.srid.auth_srid == self.layer.srid

    def build_trace(self):
        """Build only trace"""

        self.trace = self._build_trace()

    def build_layout(self):
        """Build only trace"""

        self.layout = self._build_layout()

    def _pyqt2py(self, value):
        """
        Check if the value is a PyQT object and translate it in native python object
        """

        tp = type(value)
        if tp in (QDate, QDateTime, QTime):
            if tp == QDate:
                value = value.toPyDate()
            if tp == QDateTime:
                value = value.toPyDateTime()
            if tp == QTime:
                value = value.toPyTime()

        return value

    def fetch_values_from_layer(self):  # pylint: disable=too-many-locals, too-many-branches, too-many-statements
        """
        (Re)fetches plot values from the source layer.

        Modified by Walter lorenzetti for integration into G3W-SUITE
        :param djrequest: Django HttpRequest instance.
        """

        # Note: we keep things nice and efficient and only iterate a single time over the layer!

        if self.layer:
            self.metadata_layer = MetadataVectorLayer(
                self.source_layer,
                self.layer.origname,
                layer_id=self.layer.pk,
                layer=self.layer
            )

        if not self.context_generator:
            context = QgsExpressionContext()
            context.appendScopes(
                QgsExpressionContextUtils.globalProjectLayerScopes(self.source_layer))
        else:
            context = self.context_generator.createExpressionContext()
            # add a new scope corresponding to the source layer -- this will potentially overwrite any other
            # layer scopes which may be present in the context (e.g. from atlas layers), but we need to ensure
            # that source layer fields and attributes are present in the context
            context.appendScope(
                self.source_layer.createExpressionContextScope())

        self.settings.data_defined_properties.prepare(context)

        self.fetch_layout_properties(context)

        def add_source_field_or_expression(field_or_expression):
            field_index = self.source_layer.fields().lookupField(field_or_expression)
            if field_index == -1:
                expression = QgsExpression(field_or_expression)
                if not expression.hasParserError():
                    expression.prepare(context)
                return expression, expression.needsGeometry(), expression.referencedColumns()

            return None, False, {field_or_expression}

        x_expression, x_needs_geom, x_attrs = add_source_field_or_expression(self.settings.properties['x_name']) if \
            self.settings.properties[
                'x_name'] else (None, False, set())
        y_expression, y_needs_geom, y_attrs = add_source_field_or_expression(self.settings.properties['y_name']) if \
            self.settings.properties[
                'y_name'] else (None, False, set())
        z_expression, z_needs_geom, z_attrs = add_source_field_or_expression(self.settings.properties['z_name']) if \
            self.settings.properties[
                'z_name'] else (None, False, set())
        additional_info_expression, additional_needs_geom, additional_attrs = add_source_field_or_expression(
            self.settings.layout['additional_info_expression']) if self.settings.layout[
            'additional_info_expression'] else (None, False, set())

        attrs = set().union(self.settings.data_defined_properties.referencedFields(),
                            x_attrs,
                            y_attrs,
                            z_attrs,
                            additional_attrs)

        request = QgsFeatureRequest()

        if self.settings.data_defined_properties.property(PlotSettings.PROPERTY_FILTER).isActive():
            expression = self.settings.data_defined_properties.property(
                PlotSettings.PROPERTY_FILTER).asExpression()
            request.setFilterExpression(expression)
            request.setExpressionContext(context)

        original_subset_string = self.source_layer.subsetString()

        if hasattr(self, 'filter_backends') \
                and hasattr(self, 'djrequest') \
                and hasattr(self, 'layer') \
                and self.djrequest \
                and self.layer:
            for backend in self.filter_backends:
                backend().apply_filter(self.djrequest, self.metadata_layer, request, self)


        request.setSubsetOfAttributes(attrs, self.source_layer.fields())


        if not x_needs_geom and not y_needs_geom and not z_needs_geom and not additional_needs_geom and not self.settings.data_defined_properties.hasActiveProperties():
            request.setFlags(QgsFeatureRequest.NoGeometry)

        visible_geom_engine = None
        if self.settings.properties.get('visible_features_only', False) and self.visible_region is not None:
            ct = QgsCoordinateTransform(self.visible_region.crs(), self.source_layer.crs(),
                                        QgsProject.instance().transformContext())
            try:
                rect = ct.transformBoundingBox(self.visible_region)
                request.setFilterRect(rect)
            except QgsCsException:
                pass
        elif self.settings.properties.get('visible_features_only', False) and self.polygon_filter is not None:
            ct = QgsCoordinateTransform(self.polygon_filter.crs(), self.source_layer.crs(),
                                        QgsProject.instance().transformContext())
            try:
                rect = ct.transformBoundingBox(
                    self.polygon_filter.geometry.boundingBox())
                request.setFilterRect(rect)
                g = self.polygon_filter.geometry
                g.transform(ct)

                visible_geom_engine = QgsGeometry.createGeometryEngine(
                    g.constGet())
                visible_geom_engine.prepareGeometry()
            except QgsCsException:
                pass

        # self.selected_features_only is not used into qplotly module !
        # -------------------------------------------------------------
        # if self.selected_features_only:
        #     it = self.source_layer.getSelectedFeatures(request)
        # else:
        #     it = self.source_layer.getFeatures(request)
        it = self.source_layer.getFeatures(request)

        self.qgsrequest = request

        # Some plot types don't draw individual glyphs for each feature, but aggregate them instead.
        # In that case it doesn't make sense to evaluate expressions for settings like marker size or color for each
        # feature. Instead, the evaluation should be executed only once for these settings.
        aggregating = self.settings.plot_type in ['box', 'histogram']
        executed = False

        xx = []
        yy = []
        zz = []
        additional_hover_text = []
        marker_sizes = []
        colors = []
        stroke_colors = []
        stroke_widths = []
        for f in it:
            if visible_geom_engine and not visible_geom_engine.intersects(f.geometry().constGet()):
                continue

            self.settings.feature_ids.append(f.id())
            context.setFeature(f)

            x = None
            if x_expression:
                x = x_expression.evaluate(context)
                if x == NULL or x is None:
                    continue
            elif self.settings.properties['x_name']:
                x = self._pyqt2py(f[self.settings.properties['x_name']])
                if x == NULL or x is None:
                    continue

            y = None
            if y_expression:
                y = y_expression.evaluate(context)
                if y == NULL or y is None:
                    continue
            elif self.settings.properties['y_name']:
                y = self._pyqt2py(f[self.settings.properties['y_name']])
                if y == NULL or y is None:
                    continue

            z = None
            if z_expression:
                z = z_expression.evaluate(context)
                if z == NULL or z is None:
                    continue
            elif self.settings.properties['z_name']:
                z = self._pyqt2py(f[self.settings.properties['z_name']])
                if z == NULL or z is None:
                    continue

            if additional_info_expression:
                additional_hover_text.append(
                    additional_info_expression.evaluate(context))
            elif self.settings.layout['additional_info_expression']:
                additional_hover_text.append(
                    f[self.settings.layout['additional_info_expression']])

            if x is not None:
                xx.append(x)
            if y is not None:
                yy.append(y)
            if z is not None:
                zz.append(z)

            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_MARKER_SIZE):
                default_value = self.settings.properties['marker_size']
                context.setOriginalValueVariable(default_value)
                value, _ = self.settings.data_defined_properties.valueAsDouble(PlotSettings.PROPERTY_MARKER_SIZE,
                                                                               context, default_value)
                marker_sizes.append(value)
            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_STROKE_WIDTH):
                default_value = self.settings.properties['marker_width']
                context.setOriginalValueVariable(default_value)
                value, _ = self.settings.data_defined_properties.valueAsDouble(PlotSettings.PROPERTY_STROKE_WIDTH,
                                                                               context, default_value)
                stroke_widths.append(value)

            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_COLOR) and (not aggregating or not executed):
                default_value = QColor(self.settings.properties['in_color'])
                value, conversion_success = self.settings.data_defined_properties.valueAsColor(PlotSettings.PROPERTY_COLOR, context,
                                                                                               default_value)
                if conversion_success:
                    # We were given a valid color specification, use that color
                    colors.append(value.name())
                else:
                    try:
                        # Attempt to interpret the value as a list of color specifications
                        value_list = self.settings.data_defined_properties.value(
                            PlotSettings.PROPERTY_COLOR, context)
                        color_list = [QgsSymbolLayerUtils.decodeColor(
                            item).name() for item in value_list]
                        colors.extend(color_list)
                    except TypeError:
                        # Not a list of color specifications, use the default color instead
                        colors.append(default_value.name())

            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_STROKE_COLOR) and (not aggregating or not executed):
                default_value = QColor(self.settings.properties['out_color'])
                value, conversion_success = self.settings.data_defined_properties.valueAsColor(PlotSettings.PROPERTY_STROKE_COLOR, context,
                                                                                               default_value)
                if conversion_success:
                    # We were given a valid color specification, use that color
                    stroke_colors.append(value.name())
                else:
                    try:
                        # Attempt to interpret the value as a list of color specifications
                        value_list = self.settings.data_defined_properties.value(
                            PlotSettings.PROPERTY_STROKE_COLOR, context)
                        color_list = [QgsSymbolLayerUtils.decodeColor(
                            item).name() for item in value_list]
                        stroke_colors.extend(color_list)
                    except TypeError:
                        # Not a list of color specifications, use the default color instead
                        stroke_colors.append(default_value.name())

            executed = True

        self.settings.additional_hover_text = additional_hover_text
        self.settings.x = xx
        self.settings.y = yy
        self.settings.z = zz
        if marker_sizes:
            self.settings.data_defined_marker_sizes = marker_sizes
        if colors:
            self.settings.data_defined_colors = colors
        if stroke_colors:
            self.settings.data_defined_stroke_colors = stroke_colors
        if stroke_widths:
            self.settings.data_defined_stroke_widths = stroke_widths

         # Restore the original subset string
        self.source_layer.setSubsetString(original_subset_string)
    
    def __fetch_values_from_layer(self):
        """
        (Re)fetches plot values from the source layer.

        Modified by Walter lorenzetti for integration into G3W-SUITE
        :param djrequest: Django HttpRequest instance.
        """

        # Note: we keep things nice and efficient and only iterate a single time over the layer!

        if self.layer:
            self.metadata_layer = MetadataVectorLayer(
                self.source_layer,
                self.layer.origname,
                layer_id=self.layer.pk,
                layer=self.layer
            )

        if not self.context_generator:
            context = QgsExpressionContext()
            context.appendScopes(
                QgsExpressionContextUtils.globalProjectLayerScopes(self.source_layer))
        else:
            context = self.context_generator.createExpressionContext()
            # add a new scope corresponding to the source layer -- this will potentially overwrite any other
            # layer scopes which may be present in the context (e.g. from atlas layers), but we need to ensure
            # that source layer fields and attributes are present in the context
            context.appendScope(
                self.source_layer.createExpressionContextScope())

        self.settings.data_defined_properties.prepare(context)

        self.fetch_layout_properties(context)

        def add_source_field_or_expression(field_or_expression):
            field_index = self.source_layer.fields().lookupField(field_or_expression)
            if field_index == -1:
                expression = QgsExpression(field_or_expression)
                if not expression.hasParserError():
                    expression.prepare(context)
                return expression, expression.needsGeometry(), expression.referencedColumns()

            return None, False, {field_or_expression}

        x_expression, x_needs_geom, x_attrs = add_source_field_or_expression(self.settings.properties['x_name']) if \
            self.settings.properties[
                'x_name'] else (None, False, set())
        y_expression, y_needs_geom, y_attrs = add_source_field_or_expression(self.settings.properties['y_name']) if \
            self.settings.properties[
                'y_name'] else (None, False, set())
        z_expression, z_needs_geom, z_attrs = add_source_field_or_expression(self.settings.properties['z_name']) if \
            self.settings.properties[
                'z_name'] else (None, False, set())
        additional_info_expression, additional_needs_geom, additional_attrs = add_source_field_or_expression(
            self.settings.layout['additional_info_expression']) if self.settings.layout[
            'additional_info_expression'] else (None, False, set())

        attrs = set().union(self.settings.data_defined_properties.referencedFields(),
                            x_attrs,
                            y_attrs,
                            z_attrs,
                            additional_attrs)

        request = QgsFeatureRequest()

        if self.settings.data_defined_properties.property(PlotSettings.PROPERTY_FILTER).isActive():
            expression = self.settings.data_defined_properties.property(
                PlotSettings.PROPERTY_FILTER).asExpression()
            request.setFilterExpression(expression)
            request.setExpressionContext(context)

        original_subset_string = self.source_layer.subsetString()

        if hasattr(self, 'filter_backends') \
                and hasattr(self, 'djrequest') \
                and hasattr(self, 'layer') \
                and self.djrequest \
                and self.layer:
            for backend in self.filter_backends:
                backend().apply_filter(self.djrequest, self.metadata_layer, request, self)

        request.setSubsetOfAttributes(attrs, self.source_layer.fields())

        if not x_needs_geom and not y_needs_geom and not z_needs_geom and not additional_needs_geom and not self.settings.data_defined_properties.hasActiveProperties():
            request.setFlags(QgsFeatureRequest.NoGeometry)

        visible_geom_engine = None
        if self.visible_features_only and self.visible_region is not None:
            ct = QgsCoordinateTransform(self.visible_region.crs(), self.source_layer.crs(),
                                        QgsProject.instance().transformContext())
            try:
                rect = ct.transformBoundingBox(self.visible_region)
                request.setFilterRect(rect)
            except QgsCsException:
                pass
        elif self.visible_features_only and self.polygon_filter is not None:
            ct = QgsCoordinateTransform(self.polygon_filter.crs(), self.source_layer.crs(),
                                        QgsProject.instance().transformContext())
            try:
                rect = ct.transformBoundingBox(
                    self.polygon_filter.geometry.boundingBox())
                request.setFilterRect(rect)
                g = self.polygon_filter.geometry
                g.transform(ct)

                visible_geom_engine = QgsGeometry.createGeometryEngine(
                    g.constGet())
                visible_geom_engine.prepareGeometry()
            except QgsCsException:
                pass

        # self.selected_features_only is not used into qplotly module !
        # -------------------------------------------------------------
        # if self.selected_features_only:
        #    it = self.source_layer.getSelectedFeatures(request)
        # else:
        it = self.source_layer.getFeatures(request)

        self.qgsrequest = request

        # Some plot types don't draw individual glyphs for each feature, but aggregate them instead.
        # In that case it doesn't make sense to evaluate expressions for settings like marker size or color for each
        # feature. Instead, the evaluation should be executed only once for these settings.
        aggregating = self.settings.plot_type in ['box', 'histogram']
        executed = False

        xx = []
        yy = []
        zz = []
        additional_hover_text = []
        marker_sizes = []
        colors = []
        stroke_colors = []
        stroke_widths = []
        for f in it:
            if visible_geom_engine and not visible_geom_engine.intersects(f.geometry().constGet()):
                continue

            self.settings.feature_ids.append(f.id())
            context.setFeature(f)

            x = None
            if x_expression:
                x = x_expression.evaluate(context)
                if x == NULL or x is None:
                    continue
            elif self.settings.properties['x_name']:
                x = self._pyqt2py(f[self.settings.properties['x_name']])
                if x == NULL or x is None:
                    continue

            y = None
            if y_expression:
                y = y_expression.evaluate(context)
                if y == NULL or y is None:
                    continue
            elif self.settings.properties['y_name']:
                y = self._pyqt2py(f[self.settings.properties['y_name']])
                if y == NULL or y is None:
                    continue

            z = None
            if z_expression:
                z = z_expression.evaluate(context)
                if z == NULL or z is None:
                    continue
            elif self.settings.properties['z_name']:
                z = self._pyqt2py(f[self.settings.properties['z_name']])
                if z == NULL or z is None:
                    continue

            if additional_info_expression:
                additional_hover_text.append(
                    additional_info_expression.evaluate(context))
            elif self.settings.layout['additional_info_expression']:
                additional_hover_text.append(
                    f[self.settings.layout['additional_info_expression']])

            if x is not None:
                xx.append(x)
            if y is not None:
                yy.append(y)
            if z is not None:
                zz.append(z)

            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_MARKER_SIZE):
                default_value = self.settings.properties['marker_size']
                context.setOriginalValueVariable(default_value)
                value, _ = self.settings.data_defined_properties.valueAsDouble(PlotSettings.PROPERTY_MARKER_SIZE,
                                                                               context, default_value)
                marker_sizes.append(value)
            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_STROKE_WIDTH):
                default_value = self.settings.properties['marker_width']
                context.setOriginalValueVariable(default_value)
                value, _ = self.settings.data_defined_properties.valueAsDouble(PlotSettings.PROPERTY_STROKE_WIDTH,
                                                                               context, default_value)
                stroke_widths.append(value)

            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_COLOR) and (not aggregating or not executed):
                default_value = QColor(self.settings.properties['in_color'])
                value, conversion_success = self.settings.data_defined_properties.valueAsColor(PlotSettings.PROPERTY_COLOR, context,
                                                                                               default_value)
                if conversion_success:
                    # We were given a valid color specification, use that color
                    colors.append(value.name())
                else:
                    try:
                        # Attempt to interpret the value as a list of color specifications
                        value_list = self.settings.data_defined_properties.value(
                            PlotSettings.PROPERTY_COLOR, context)
                        color_list = [QgsSymbolLayerUtils.decodeColor(
                            item).name() for item in value_list]
                        colors.extend(color_list)
                    except TypeError:
                        # Not a list of color specifications, use the default color instead
                        colors.append(default_value.name())

            if self.settings.data_defined_properties.isActive(PlotSettings.PROPERTY_STROKE_COLOR) and (not aggregating or not executed):
                default_value = QColor(self.settings.properties['out_color'])
                value, conversion_success = self.settings.data_defined_properties.valueAsColor(PlotSettings.PROPERTY_STROKE_COLOR, context,
                                                                                               default_value)
                if conversion_success:
                    # We were given a valid color specification, use that color
                    stroke_colors.append(value.name())
                else:
                    try:
                        # Attempt to interpret the value as a list of color specifications
                        value_list = self.settings.data_defined_properties.value(
                            PlotSettings.PROPERTY_STROKE_COLOR, context)
                        color_list = [QgsSymbolLayerUtils.decodeColor(
                            item).name() for item in value_list]
                        stroke_colors.extend(color_list)
                    except TypeError:
                        # Not a list of color specifications, use the default color instead
                        stroke_colors.append(default_value.name())

            executed = True

        self.settings.additional_hover_text = additional_hover_text
        self.settings.x = xx
        self.settings.y = yy
        self.settings.z = zz
        if marker_sizes:
            self.settings.data_defined_marker_sizes = marker_sizes
        if colors:
            self.settings.data_defined_colors = colors
        if stroke_colors:
            self.settings.data_defined_stroke_colors = stroke_colors
        if stroke_widths:
            self.settings.data_defined_stroke_widths = stroke_widths

        # Restore the original subset string
        self.source_layer.setSubsetString(original_subset_string)




class QplotlyFactoringRelation(QplotlyFactoring):
    """Inherit form QplotlyFactoring and is specific for relations"""

    filter_backends = QplotlyFactoring.filter_backends + \
        (ByFatherFeatursFilter, )
    
    filter_backends = QplotlyFactoring.filter_backends + \
        (ByFatherFeatursFilter, )

    def set_father_features_expresion(self, qgs_relation=None, fsource_layer=None, ffiltered_features=None):
        """
        Create expression and set into class
        :param qgs_relation: QgsRelation instance
        :param fsource_layer: QgsVectorLayer instance of father
        :param ffiltered_features: QgsFeatureiterator of father
        :return: Boolean
        """

        # get features and
        features = fsource_layer.getFeatures() if fsource_layer else ffiltered_features

        expressions = []
        for f in features:
            expressions.append(qgs_relation.getRelatedFeaturesFilter(qgs_relation.referencedLayer().
                                                                     getFeature(int(f.id()))))

        if expressions:
            self.father_features_expresion = ' OR '.join(expressions)
        else:
            self.father_features_expresion = 'false'
