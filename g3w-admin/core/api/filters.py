# coding=utf-8
""""Filters for QGIS feature requests

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-02-10'
__copyright__ = 'Copyright 2020, Gis3w'

from django.contrib.gis.geos import GEOSGeometry, GEOSException
import json
from qgis.core import (
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsFeatureRequest,
    QgsRectangle,
    QgsCoordinateTransformContext,
    QgsExpressionContextUtils,
    QgsJsonUtils,
    QgsGeometry
)
from rest_framework.exceptions import ParseError
from urllib.parse import unquote
from core.utils.qgisapi import get_qgis_layer, get_qgis_features
from qdjango.models import Layer
import re

class BaseFilterBackend():
    """Base class for QGIS request filters"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):
        """Apply the filter to the QGIS feature request or the layer's subset string.
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.

        :param request: Django request
        :type request: HttRequest
        :param metadata_layer: MetadataVectorLayer instance
        :type metadata_layer: Layer
        :param qgis_feature_request: QGIS feature request
        :type qgis_feature_request: QgsFeatureRequest
        :param view: Django view, optional
        :type view: Django view, must have a layer member which is a QDjango Layer instance
        :raises NotImplementedError: all subclasses must implement this method
        """

        raise NotImplementedError("All subclasses must implement this method")

    def _is_valid_field(self, qgis_layer, field_name, view=None):
        """Checks if the field name belongs to the layer and if it's not to be excluded from WFS/WMS

        :param qgis_layer: layer
        :type qgis_layer: QgsVectorLayer
        :param field_name: field name
        :type field_name: str
        :param view: the Django caller view, defaults to None
        :type view: Django view, optional
        """

        exclude_fields = []

        if view is not None and view.layer.exclude_attribute_wms:
            exclude_fields = eval(view.layer.exclude_attribute_wms)

        return field_name not in exclude_fields and field_name in qgis_layer.fields().names()

    def _quote_identifier(self, identifier):
        """Returns a quoted identifier enclosed by double quotes"""

        return '"%s"' % identifier.replace('"', '\\"')

    def _quote_value(self, identifier):
        """Returns a quoted value enclosed by single quotes"""

        return "'%s'" % identifier.replace('\'', '\\\'')


class SearchFilter(BaseFilterBackend):
    """A filter backend that does an ILIKE string search in all fields"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        qgis_layer = metadata_layer.qgis_layer

        # Try to get param from GET
        search_value = request.query_params.get('search')

        if not search_value:
            # Try to get from POST
            search_value = request.data.get('search')

        if search_value:

            search_parts = []

            for search_term in search_value.split(','):

                search_term = self._quote_value('%' + search_term + '%')
                exp_template = '{field_name} ILIKE ' + search_term
                exp_parts = []

                for f in qgis_layer.fields():

                    if not self._is_valid_field(qgis_layer, f.name(), view):
                        continue
                    exp_parts.append(exp_template.format(
                        field_name=self._quote_identifier(f.name())))

                if exp_parts:
                    search_parts.append(' OR '.join(exp_parts))

            if search_parts:

                search_expression = '(' + ' AND '.join(search_parts) + ')'
                qgis_feature_request.combineFilterExpression(search_expression)


class OrderingFilter(BaseFilterBackend):
    """A filter backend that defines ordering"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        qgis_layer = metadata_layer.qgis_layer

        # Try to get param from GET
        ordering_value = request.query_params.get('ordering')

        if not ordering_value:
            # Try to get from POST
            ordering_value = request.data.get('ordering')

        if ordering_value is not None:

            ordering_rules = []

            for ordering in ordering_value.split(','):
                ascending = True
                if ordering.startswith('-'):
                    ordering = ordering[1:]
                    ascending = False

                if not self._is_valid_field(qgis_layer, ordering, view):
                    continue

                # Because the fields inside a QGIS expression must be declared inside
                # the expression string with the double brackets ("field_name")
                ordering_rules.append(QgsFeatureRequest.OrderByClause(
                    f'"{ordering}"', ascending))

            if ordering_rules:
                order_by = QgsFeatureRequest.OrderBy(ordering_rules)
                qgis_feature_request.setOrderBy(order_by)


class IntersectsBBoxFilter(BaseFilterBackend):

    def _get_filter_bbox(self, request):
        """Creates a QgsRectangle from the BBOX request

        :param request: request
        :type request: django request
        :raises ParseError: parse error
        :return: bbox rectangle
        :rtype: QgsRectangle
        """

        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params
        bbox_string = request_data.get('in_bbox', None)
        if not bbox_string:
            return None

        try:
            p1x, p1y, p2x, p2y = (float(n) for n in bbox_string.split(','))
        except ValueError:
            raise ParseError(
                'Invalid bbox string supplied for parameter in_bbox')

        return QgsRectangle(p1x, p1y, p2x, p2y)

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        qgis_layer = metadata_layer.qgis_layer

        # only for layer with geometry
        if not qgis_layer.isSpatial():
            return

        bbox_filter = self._get_filter_bbox(request)

        if bbox_filter:

            include_overlapping = getattr(
                view, 'bbox_filter_include_overlapping', True)

            if not include_overlapping:
                # FIXME: IntersectsBBoxFilter within operator
                raise NotImplementedError(
                    'IntersectsBBoxFilter within operator not yet implemented')

            if hasattr(view, 'reproject') and view.reproject:
                from_srid = view.layer.project.group.srid.auth_srid
                to_srid = view.layer.srid
                ct = QgsCoordinateTransform(QgsCoordinateReferenceSystem(
                    from_srid), QgsCoordinateReferenceSystem(to_srid), QgsCoordinateTransformContext())
                bbox_filter = ct.transform(bbox_filter)

            qgis_feature_request.setFilterRect(bbox_filter)


class CentroidBBoxFilter(IntersectsBBoxFilter):
    # FIXME: untested

    def __init__(self, **kwargs):

        self.tolerance = kwargs['tolerance'] if 'tolerance' in kwargs else 10
        super(CentroidBBoxFilter, self).__init__(**kwargs)

    def _get_filter_bbox(self, request):

        tolerance = request.query_params.get('tolerance', '10')
        polygon = super()._get_filter_bbox(request)
        return polygon.buffered(float(tolerance))


class SuggestFilterBackend(BaseFilterBackend):
    """Backend filter that returns ILIKE matches for a field|value tuple"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        qgis_layer = metadata_layer.qgis_layer

        # Try to get param from GET
        suggest_value = request.query_params.get('suggest', request.data.get('suggest'))

        if suggest_value:

            # get field and value
            field_name, field_value = suggest_value.split('|')

            if not self._is_valid_field(qgis_layer, field_name):
                raise Exception(f"{field_name} doesn't belongs from layer!")

            if field_name and field_value:

                search_expression = '{field_name} ILIKE {field_value}'.format(
                    field_name=self._quote_identifier(field_name),
                    field_value=self._quote_value('%' + field_value + '%')
                )

                qgis_feature_request.combineFilterExpression(search_expression)


class FieldFilterBackend(BaseFilterBackend):
    """Backend filter that returns matches for a field|operator|value|logic_operator tuple"""

    COMPARATORS_MAP = {
        'eq': '=',
        'gt': '>',
        'lt': '<',
        'ltgt': '<>',
        'gte': '>=',
        'lte': '<=',
        'like': 'LIKE',
        'ilike': 'ILIKE',
        'in': 'IN'
    }

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        qgis_layer = metadata_layer.qgis_layer

        # Check for field parameter
        suggest_value = request.query_params.get('field', request.data.get('field'))

        # Check for formatter parameter
        formatter = str(request.query_params.get('formatter', request.data.get('formatter')))

        if suggest_value:

            # get field and value and operator
            # ie. ?field=name|eq|Rome, ?field=name|eq|Rome|and
            # field can be multiple separated by ','
            # i.e. $field=name|eq|Rome,state|eq|Italy

            #pattern = r',(?=(?:[^()]*\([^()]*\))*[^()]*$)'
            #pattern = r',(?=(?:[^()[\]]*(?:\([^()]*\)|\[[^\[\]]*\]))*[^()[\]]*$)'
            #fields = re.split(pattern, suggest_value)

            pattern = re.compile(r'\|(AND|OR),')
            fields = []
            last_index = 0
            for match in pattern.finditer(suggest_value):
                end = match.end()  # where separator end
                op = match.group(1)
                segment = suggest_value[last_index:match.start()] + f'|{op}'
                fields.append(segment)
                last_index = end
            # Add last part
            fields.append(suggest_value[last_index:])


            count = 0
            nfields = len(fields)
            search_expression = ''

            for field in fields:
                try:
                    field_name, field_operator, field_value, field_logicop = field.split(
                        '|')
                    field_logicop = field_logicop.upper()
                except ValueError as e:
                    try:
                        field_name, field_operator, field_value = field.split(
                            '|')
                        field_logicop = 'AND'
                    except ValueError:
                        raise ParseError(
                            'Invalid field string supplied for parameter field')

                # Make lowercase field_operator
                field_operator = field_operator.lower()
                if not self._is_valid_field(qgis_layer, field_name):
                    raise Exception(
                        f"{field_name} doesn't belong from layer {qgis_layer.name()}!")

                if field_name and field_value:

                    pre_post_operator = '%' if field_operator in (
                        'like', 'ilike') else ''

                    if (formatter
                        and formatter.isnumeric()
                        and int(formatter) == 1
                        and view.layer.has_value_relation_widget(field_name)
                    ):
                        config = qgis_layer.editorWidgetSetup(
                            qgis_layer.fields().indexFromName(field_name)
                        ).config()
                        relation_qgs_layer = get_qgis_layer(
                            view.layer.project.layer_set.get(qgs_layer_id=config["Layer"])
                        )

                        qfr = QgsFeatureRequest()
                        pre_post_operator = "%" if field_operator in ("like", "ilike") else ""
                        vr_single_search_expression = (
                            "{field_name} {field_operator} {field_value}".format(
                                field_name=self._quote_identifier(config["Value"]),
                                field_operator=self.COMPARATORS_MAP[field_operator],
                                field_value=self._quote_value(
                                    f"{pre_post_operator}{unquote(field_value)}{pre_post_operator}"
                                ),
                            )
                        )


                        qfr.combineFilterExpression(vr_single_search_expression)
                        features = get_qgis_features(relation_qgs_layer, qfr)

                        if len(features) > 0:
                            field_operator = "in"
                            in_content = ",".join([str(f[config["Key"]]) for f in features])
                            field_value = f"({in_content})"

                    pre_post_operator = "%" if field_operator in ("like", "ilike") else ""
                    if field_operator != 'in':
                        quoted_field_value = self._quote_value(
                            f'{pre_post_operator}{unquote(field_value)}{pre_post_operator}')
                    else:
                        # Case 'in' operator
                        # Expexted format: [1,2,3] or [a,b,c] or (1,2,3) or (a,b,c)
                        single_values = field_value[1:-1].split(',')
                        field_value = f"({','.join([self._quote_value(sv.strip()) for sv in single_values])})"
                        quoted_field_value = unquote(field_value)

                    single_search_expression = '{field_name} {field_operator} {field_value}'.format(
                        field_name=self._quote_identifier(field_name),
                        field_operator=self.COMPARATORS_MAP[field_operator],
                        field_value=quoted_field_value
                    )

                    search_expression = f'{search_expression} {single_search_expression}'

                    if count != nfields - 1:
                        search_expression = f'{search_expression} {field_logicop} '

                count += 1

            if search_expression != '':
                qgis_feature_request.combineFilterExpression(search_expression)


class QgsExpressionFilterBackend(BaseFilterBackend):
    """QgisExpression filter: sets a QgsExpression based filter and optionally
    adds a form feature to the expression context (`form_data` and `qgs_layer_id`
    are used in this case).

    Setting a form feature in the context allow using `current_value(<attr_name>)`
    and similar functions in the expression.

    Accepts POST data only:

    'expression': the QgsExpression text

    Optionally, a form feature can be added to the expression context:

    'form_data': GeoJSON representation of the feature currently begin edited in the form
    'qgs_layer_id': the QGIS layer id for the `form_data` feature

    """

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        def _get_form_feature(layer, form_data):
            """
            Internal function to build form feature for expression scopes
            """

            fields = layer.qgis_layer.fields()
            form_feature = QgsJsonUtils.stringToFeatureList(
                json.dumps(form_data), fields, None)[0]
            for k, v in form_data['properties'].items():
                form_feature.setAttribute(k, v)

            return form_feature

        if request.data and request.data.get('expression'):
            qgis_feature_request.combineFilterExpression(
                request.data.get('expression'))

            if request.data.get('form_data') and request.data.get('qgs_layer_id'):
                try:
                    project = Layer.objects.get(pk=metadata_layer.layer_id).project
                    layer = Layer.objects.get(
                        project=project, qgs_layer_id=request.data.get('qgs_layer_id'))

                    # Append global, project ,layer context
                    qgis_feature_request.expressionContext().appendScopes(
                        QgsExpressionContextUtils.globalProjectLayerScopes(layer.qgis_layer))

                    qgis_feature_request.expressionContext().appendScope(
                        QgsExpressionContextUtils.formScope(_get_form_feature(layer, request.data.get('form_data'))))

                    # Add ParteFormScope if parent is set
                    if request.data.get('parent'):
                        parent = request.data.get('parent')
                        parent_layer = project.layer_set.get(qgs_layer_id=parent['qgs_layer_id'])

                        qgis_feature_request.expressionContext().appendScope(
                            QgsExpressionContextUtils.parentFormScope(_get_form_feature(parent_layer,
                                                                                        parent['form_data'])))

                except:
                    raise Exception("Layer or project could not be found!")


class WKTPolyFilter(BaseFilterBackend):
    """
    A REST API filter for filter data by WKT geometry (Polygon/MultiPolygon) with intersects/contains method
    """

    def _get_wkt_from_request(self, request_data):
        """Get WKT from request and validate it

        :param request_data: request data
        :type request_data: dict
        :raises ParseError: parse error
        :return: wkt string, comparison method (intersects, contains)
        :rtype: str, str
        """

        # Check for geo_filter_wkt
        wkt = request_data.get('geo_filter_wkt')

        if not wkt:
            return None, None

        # Check for Comparison method
        comp_method = request_data.get('geo_filter_mode')

        if not comp_method:

            # Default method
            comp_method = 'intersects'

        else:
            if comp_method not in ('intersects, contains'):
                raise ParseError("'geo_filter_mode' must be one of ('intersects', 'contains')")

        # Validate WKT
        # ---------------------------------------
        err_msg = 'The WKT geometry is not valid'
        try:
            geometry = GEOSGeometry(wkt)

            # Check topology of the geometry
            if not geometry.valid:
                raise ParseError(err_msg)

        except (GEOSException, ValueError) as e:
            raise ParseError(f"{err_msg}: {e}")

        return wkt, comp_method

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):

        qgis_layer = metadata_layer.qgis_layer

        # only for layer with geometry
        if not qgis_layer.isSpatial():
            return

        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params

        wkt, comp_method = self._get_wkt_from_request(request_data)

        if wkt:

            # Check if necessary reproject
            if hasattr(view, 'reproject') and view.reproject:

                geom = QgsGeometry.fromWkt(wkt)
                from_srid = view.layer.project.group.srid.auth_srid
                to_srid = view.layer.srid
                ct = QgsCoordinateTransform(QgsCoordinateReferenceSystem(
                    from_srid), QgsCoordinateReferenceSystem(to_srid), QgsCoordinateTransformContext())
                geom.transform(ct)

                # Restore to WKT
                wkt = geom.asWkt()

            # Build expression string
            expression = f"{comp_method}(geom_from_wkt('{wkt}'), $geometry)"

            qgis_feature_request.combineFilterExpression(expression)

