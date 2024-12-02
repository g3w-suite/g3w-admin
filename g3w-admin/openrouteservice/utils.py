# coding=utf-8
""""Openrouteservice utils

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'

import hashlib
import json
import logging
import os
import re
import traceback

import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from huey.contrib import djhuey as huey
from qdjango.apps import remove_project_from_cache
from qdjango.models import Layer, Project, QgisProjectFileLocker
from qgis.core import (QgsCoordinateReferenceSystem, QgsCoordinateTransform,
                       QgsDataProvider, QgsDataSourceUri, QgsExpression,
                       QgsFeatureRequest, QgsField, QgsGeometry, QgsJsonUtils,
                       QgsLabeling, QgsMapLayerType, QgsPalLayerSettings,
                       QgsProviderConnectionException, QgsProviderRegistry,
                       QgsRuleBasedRenderer, QgsSymbol, QgsVectorFileWriter,
                       QgsVectorLayer, QgsVectorLayerSimpleLabeling,
                       QgsVectorLayerUtils, QgsWkbTypes)
from qgis.PyQt.QtCore import QDateTime, Qt, QTemporaryDir, QVariant
from qgis.PyQt.QtGui import QColor
from rest_framework import status

from .models import ORS_REQUIRED_LAYER_FIELDS, OpenrouteserviceProject

ORS_API_KEY = getattr(settings, 'ORS_API_KEY', None)
ORS_PROFILES = settings.ORS_PROFILES  # mandatory!
ORS_MAX_LOCATIONS = getattr(settings, 'ORS_MAX_LOCATIONS', 2)


logger = logging.getLogger('openrouteservice')


def get_connection_hash(connection_uri):
    """Create a connection id (md5 hash) from a connection data source uri.

    :param connection_uri:connection data source uri
    :type connection_uri: str
    :return: connection id
    :rtype: str
    """
    return hashlib.md5(connection_uri.encode('utf-8')).hexdigest()


def is_ors_compatible(layer):
    """Check layer ORS compatibility"""

    if layer.type() != QgsMapLayerType.VectorLayer or layer.readOnly() or layer.geometryType() != QgsWkbTypes.PolygonGeometry:
        return False
    fields = layer.fields()
    for field_name, field_type in ORS_REQUIRED_LAYER_FIELDS.items():
        # Shapefile attributes max length is 10
        if layer.publicSource().endswith('.shp'):
            field_name = field_name[:10]
        if fields.lookupField(field_name) < 0 or not QVariant(fields.field(fields.lookupField(field_name)).type()).canConvert(field_type):
            return False
    return True


def get_db_connections(qgis_project):
    """Returns a dictionary of DB connections in the QGIS project, OGR connections with
    no "layername" specification are not  returned because by appending another layer we
    might break the project.

    Returned dictionary:

    {
        '<connection datasource uri>':  // <--- !!! may contain credentials !!!
        {
            'id': "dbname='test_g3w-admin' host=localhost port=5432 user='ale' sslmode=disable schema='public'",
            'name': "test_g3w-admin (postgres host:localhost, port:5432, schema:'public')",
            'provider': 'postgres',
            'schema': 'public'
        }

    }

    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    Warning: the dictionary key may contain secrets(passwords): do not disclose to the client!

    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    :param qgis_project: QGIS vector layer instance
    :type qgis_project: QgsVectorLayer
    :return: dictionary of DB connections in the QGIS project
    :rtype:dict
    """

    connections = {}
    for vector_layer in [layer for layer in qgis_project.mapLayers().values() if layer.type() == QgsMapLayerType.VectorLayer and not layer.readOnly()]:

        dp = vector_layer.dataProvider()
        if dp is not None and bool(dp.capabilities() & QgsDataProvider.Database):

            # For OGR we have a file path
            if dp.name() == 'ogr':
                path = vector_layer.publicSource()
                if 'layername' in path.lower():
                    # Get base path: remove layername
                    path = re.sub(r'\|layername=.*$', '', path,  re.IGNORECASE)
                    name = os.path.basename(path)
                    connections[path] = {
                        'id': get_connection_hash(path),
                        'name': name,
                        'provider': dp.name(),
                    }

            else:
                md = QgsProviderRegistry.instance().providerMetadata(dp.name())

                if md is not None:

                    conn = md.createConnection(dp.uri().uri(), {})

                    if conn is not None:
                        uri = QgsDataSourceUri(dp.uri())
                        conn_id = conn.uri()

                        if dp.uri().schema():
                            conn_id += ' schema=\'%s\'' % dp.uri().schema()

                        details = []
                        for detail in ('service', 'host', 'port', 'schema'):
                            value = getattr(dp.uri(), detail)()
                            if value:
                                if detail == 'schema':
                                    # Quote schema
                                    value = '\'%s\'' % value
                                details.append('%s:%s' % (
                                    detail, value))
                        details = ', '.join(details)

                        conn_name = "{dbname} ({provider_name} {details})".format(
                            dbname=os.path.basename(uri.database()), provider_name=dp.name(), details=details)

                        if not conn_id in connections:
                            connections[conn_id] = {
                                'id': get_connection_hash(conn_id),
                                'name': conn_name,
                                'provider': dp.name(),
                                'schema': dp.uri().schema()
                            }

    return connections


def check_user_permissions(user, project, service=None):
    """Check user Openrouteservice permissions on a project and optionally on a service.

    If service is not specified, the function returns True if at least one service is available.

    :param user: Django user
    :type user: Django user instance
    :param project: QDjango project instance
    :type project: Project
    :param service: OpenrouteserviceProject service, optional
    :type service: OpenrouteserviceProjectService
    :return: True if user has permissions
    :rtype: bool
    """

    if not user.has_perm('change_project', project):
        return False

    try:
        if service is not None:
            OpenrouteserviceProject.objects.get(
                project=project, services__contains=service.value)
        else:
            OpenrouteserviceProject.objects.get(project=project)
    except:
        return False

    return True


def config(project):
    """Returns openrouteservice configuration for a project.

    WARNING: Permissions are not checked! It is responsibility of calling code to
             check project permissions, see `check_user_permissions(user, project, service)`.

    Example returned value:

    {
        // This part is specific for isochrones
        "isochrones":
        {
            "compatible": [
                {
                    'layer_id': 13,
                    'qgis_layer_id': 'openrouteservice_compatible_3857_b8432614_8f73_46de_8c68_366d5249d470'
                },
                {
                    'layer_id': 14,
                    'qgis_layer_id': 'openrouteservice_compatible_dd8c034a_a482_4047_9509_1d6dd3bd5c81'
                }
            ],
            "pointlayers":  // Point and multipoint layers
            {
                {
                    'layer_id': 23,
                    'qgis_layer_id': 'points_3857_b8432614_8f73_46de_8c68_366d5249d470'
                },
                {
                    'layer_id': 24,
                    'qgis_layer_id': 'multipoints_dd8c034a_a482_4047_9509_1d6dd3bd5c81'
                }

            },
            "profiles": {
                "driving-car": {
                    "name": "Car"
                }
            }
        },
        // This part may be useful for other services in the future
        "connections":[
            {
                "id":"41fcba09f2bdcdf315ba4119dc7978dd",
                "name":"isochrone gpkg.gpkg",
                "provider":"ogr"
            },
            {
                "id":"41fcba09f2bdcdf315ba4119dc7978dd",
                "name":"test_g3w-admin (postgres host:localhost, port:5432, schema:'openrouteservice test')",
                "provider":"postgres",
                "schema":"openrouteservice test"
            },
            {
                "id":"41fcba09f2bdcdf315ba4119dc7978dd",
                "name":"isochrone sqlite.sqlite (spatialite )",
                "provider":"spatialite",
                "schema":""
            },
            {
                "id":"isochrone sqlite.sqlite",
                "name":"isochrone sqlite.sqlite",
                "provider":"ogr"
            }
        ],
    }

    :param project: QDjango project instance
    :type project: Project
    :return: openrouteservice configuration dictionary
    :rtype: dict
    """

    compatible = []
    pointlayers = []
    connections = []

    for layer in project.layer_set.all():

        # Try to invalidate the cache
        if layer.qgis_layer is None:
            remove_project_from_cache(project.qgis_project.fileName())

        if layer.qgis_layer is None:
            logger.warning('Layer %s has no valid QGIS layer!' % layer.name)
        else:
            if is_ors_compatible(layer.qgis_layer):
                compatible.append({
                    'layer_id': layer.pk,
                    'qgis_layer_id': layer.qgs_layer_id,
                })
            if layer.qgis_layer.type() == QgsMapLayerType.VectorLayer and layer.qgis_layer.geometryType() == QgsWkbTypes.PointGeometry:
                pointlayers.append({
                    'layer_id': layer.pk,
                    'qgis_layer_id': layer.qgs_layer_id,
                })

    connections = get_db_connections(project.qgis_project)

    return {
        'isochrones': {
            'compatible': compatible,
            'pointlayers': pointlayers,
            'profiles': ORS_PROFILES
        },
        'connections': list(connections.values()),
    }


def isochrone(profile, params):
    """Calls the isochrone ORS service and returns the response.

    Expected params (dict):

        {
            "locations":[[10.859513,43.401984]],
            "range_type":"time",
            "range":[480],
            "interval":60,
            "location_type":"start",
            "attributes":[
                "area",
                "reachfactor",
                "total_pop"
            ]
        }

    * "range": Maximum range value of the analysis in seconds for time and metres for distance.
               Alternatively a comma separated list of specific single range values.
    * "locations": The locations to use for the route as an array of longitude/latitude pairs

    """

    headers = {
        'Accept': 'application/json, application/geo+json; charset=utf-8',
        'Content-Type': 'application/json; charset=utf-8'
    }

    # Fix interval = 0
    try:
        if int(params['interval']) == 0:
            del (params['interval'])
    except KeyError:
        pass

    json_params = params

    if ORS_API_KEY is not None:
        headers['Authorization'] = ORS_API_KEY

    url_path = os.path.join(
        settings.ORS_API_ENDPOINT, 'isochrones', profile)

    logger.debug('Calling ORS endpoint %s:\n%s' % (url_path, json.dumps(json_params)))

    response = requests.post(url_path, json=json_params, headers=headers)
    return response


def apply_style(layer, style, is_new, name):
    """Apply the style to a new or existing layer

    :param layer: QGIS layer instance
    :type layer: QgsVectorLayer
    :param style: optional, dictionary with style properties: example {'color': [100, 50, 123], 'transparency': 0.5, 'stroke_width: 3 }
    :type style: dict
    :param is_new: True is the layer is a new layer
    :type is_new: bool
    :param name: name of the isochrone, if blank/None create a timestamp for the name if the layer is not new
    :type name: str
    """

    if style is None:
        return

    def _set_labeling():
        pal_layer = QgsPalLayerSettings()
        pal_layer.fieldName = 'value'
        pal_layer.enabled = True
        pal_layer.placementFlags = QgsLabeling.OnLine
        pal_layer.placement = QgsPalLayerSettings.PerimeterCurved
        text_format = pal_layer.format()
        buffer = text_format.buffer()
        buffer.setColor(QColor(255, 255, 255))
        buffer.setOpacity(0.5)
        buffer.setEnabled(True)
        text_format.setBuffer(buffer)
        pal_layer.setFormat(text_format)
        labels = QgsVectorLayerSimpleLabeling(pal_layer)
        return labels

    def _set_rule(renderer):
        root_rule = renderer.rootRule()
        if is_new:
            rule = root_rule.children()[0]
        else:
            rule = root_rule.children()[0].clone()
        rule.setLabel(name)
        expression = '"name" = {}'.format(QgsExpression.quotedString(name))
        rule.setFilterExpression(expression)
        rule.symbol().setColor(QColor(*style['color'], 255))
        rule.symbol().setOpacity(1 - style['transparency'])
        rule.symbol().symbolLayers()[0].setStrokeWidth(style['stroke_width'])
        rule.symbol().symbolLayers()[0].setStrokeColor(QColor(255, 255, 255))
        if not is_new:
            root_rule.appendChild(rule)

    if is_new:  # Create the new style
        symbol = QgsSymbol.defaultSymbol(layer.geometryType())
        renderer = QgsRuleBasedRenderer(symbol)
        req = QgsFeatureRequest()
        req.addOrderBy('"value"', False, False)
        renderer.setOrderBy(req.orderBy())
        renderer.setOrderByEnabled(True)
        _set_rule(renderer)
        # Delete first rule
        layer.setRenderer(renderer)
        labels = _set_labeling()
        layer.setLabeling(labels)
        layer.setCustomProperty("labeling/bufferDraw", True)
        layer.setLabelsEnabled(True)

    else:
        # Check for rule based renderer, pass if not present
        renderer = layer.renderer()
        if isinstance(renderer, QgsRuleBasedRenderer):
            _set_rule(renderer)


def add_geojson_features(geojson, project, qgis_layer_id=None, connection_id=None, new_layer_name=None, name=None, style=None):
    """Add geojson features to a destination layer, the layer can be specified
    by passing a QgsVectorLayer instance or by specifying a connection and
    a new layer name plus the QDjango project for the new layer.

    The connection may assume the special values `__shapefile__`, `__spatialite__` or `__geopackage__`
    for the creation of new OGR files of the corresponding type.

    The creation of the new layer may raise an exception is a layer with the same name as
    new_layer_name already exists. For already existing layers the `qgis_layer_id` can be used,
    provided that the layer belongs to the current `project`.

    Returns the qgis_layer_id

    :param geojson: new features in GeoJSON format
    :type geojson: str
    :param project: QDjango Project instance for the new or the existing layer
    :type project: Project instance
    :param layer_id: optional, QGIS layer id
    :type layer_id: QGIS layer id
    :param connection: optional, connection id or the special value `__shapefile__`, `__spatialite__` or `__geopackage__`
    :type connection: str
    :param new_layer_name: optional, name of the new layer
    :type new_layer_name: str
    :param name: optional, name of the isochrone, default to current datetime
    :type name: str
    :param style: optional, dictionary with style properties: example {'color': [100, 50, 123], 'transparency': 0.5, 'stroke_width: 3 }
    :type style: dict
    :raises Exception: raise on error
    :rtype: str
    """

    # Additional fields that are not returned by the service as feature attributes
    json_data = json.loads(geojson)

    if name is None:
        name = "Isochrone %s" % QDateTime.currentDateTime().toString(Qt.ISODateWithMs)

    metadata = {
        'range_type': json_data['metadata']['query']['range_type'],
        'name': name,
        # 'timestamp': json_data['metadata']['timestamp'],  // Not supported
    }

    for f in json_data['features']:
        f['properties'].update(metadata)

    geojson = json.dumps(json_data)

    fields = QgsJsonUtils.stringToFields(geojson)

    # Patch timestamp type to DateTime // Not supported
    # fields.remove(fields.lookupField('timestamp'))
    #fields.append(QgsField('timestamp', QVariant.DateTime))

    # Create the new layer
    if connection_id is not None:

        def _write_to_ogr(destination_path, new_layer_name, driverName=None):
            """Writes features to new or existing OGR layer"""

            tmp_dir = QTemporaryDir()
            tmp_path = os.path.join(tmp_dir.path(), 'isochrone.json')
            with open(tmp_path, 'w+') as f:
                f.write(geojson)

            tmp_layer = QgsVectorLayer(tmp_path, 'tmp_isochrone', 'ogr')

            if not tmp_layer.isValid():
                raise Exception(
                    _('Cannot create temporary layer for isochrone result.'))

            # Note: shp attribute names are max 10 chars long
            save_options = QgsVectorFileWriter.SaveVectorOptions()
            if driverName is not None:
                save_options.driverName = driverName
            save_options.layerName = new_layer_name
            save_options.fileEncoding = 'utf-8'

            # This is nonsense to me: if the file does not exist the actionOnExistingFile
            # should be ignored instead of raising an error, probable QGIS bug
            if os.path.exists(destination_path):
                # Check if the layer already exists
                layer_exists = QgsVectorFileWriter.targetLayerExists(
                    destination_path, new_layer_name)

                if layer_exists:
                    raise Exception(
                        _('Cannot save isochrone result to destination layer: layer already exists (use "qgis_layer_id" instead)!'))

                save_options.actionOnExistingFile = QgsVectorFileWriter.CreateOrOverwriteLayer

            error_code, error_message = QgsVectorFileWriter.writeAsVectorFormatV2(
                tmp_layer,
                destination_path,
                project.qgis_project.transformContext(),
                save_options
            )

            if error_code != QgsVectorFileWriter.NoError:
                raise Exception(
                    _('Cannot save isochrone result to destination layer: ') + error_message)

            layer_uri = destination_path

            if driverName != 'ESRI Shapefile':
                layer_uri += '|layername=' + new_layer_name

            provider = 'ogr'
            return layer_uri, provider

        destination_path = None

        if connection_id == '__shapefile__':  # new shapefile
            driverName = 'ESRI Shapefile'
            extension = 'shp'
        elif connection_id == '__spatialite__':  # new sqlite
            driverName = 'SpatiaLite'
            extension = 'sqlite'
        elif connection_id == '__geopackage__':  # new gpkg
            driverName = 'GPKG'
            extension = 'gpkg'
        else:  # Add new table to an existing DB connection

            try:
                connection = get_db_connections(project.qgis_project)[
                    connection_id]
            except:
                raise Exception(
                    _('Wrong connection id.'))

            if connection['provider'] == 'ogr':
                destination_path = connection_id
                driverName = 'GPKG' if destination_path.lower().endswith(
                    '.gpkg') else 'SpatiaLite'
            else:
                driverName = None

        # Create a new file/layer
        if driverName is not None:
            new_layer_name = os.path.basename(new_layer_name)

            if destination_path is None:  # new files!
                destination_path = os.path.join(
                    settings.DATASOURCE_PATH, "{}.{}".format(new_layer_name, extension))
                i = 0
                while os.path.exists(destination_path):
                    i += 1
                    destination_path = os.path.join(
                        settings.DATASOURCE_PATH, "{}_{}.{}".format(new_layer_name, i, extension))

            layer_uri, provider = _write_to_ogr(
                destination_path, new_layer_name, driverName)

        # Create a new DB table
        else:
            assert connection['provider'] != 'ogr'
            md = QgsProviderRegistry.instance().providerMetadata(
                connection['provider'])
            if not md:
                raise Exception(
                    _('Error creating destination layer connection.'))
            conn = md.createConnection(connection_id, {})
            try:
                conn.createVectorTable(
                    connection['schema'], new_layer_name, fields, QgsWkbTypes.Polygon, QgsCoordinateReferenceSystem(4326), False, {'geometryColumn': 'geom'})
            except QgsProviderConnectionException as ex:
                raise Exception(
                    _('Error creating destination layer: ') + str(ex))

            uri = QgsDataSourceUri(conn.uri())
            uri.setTable(new_layer_name)
            uri.setSchema(connection['schema'])
            uri.setSrid('4326')
            uri.setGeometryColumn('geom')
            provider = connection['provider']
            layer_uri = uri.uri()

        # Now reload the new layer and add it to the project
        qgis_layer = QgsVectorLayer(layer_uri, new_layer_name, provider)
        if not qgis_layer.isValid():
            raise Exception(
                _('Error creating destination layer: layer is not valid!'))

        qgis_layer_id = qgis_layer.id()

        with QgisProjectFileLocker(project) as project:
            apply_style(qgis_layer, style, True, name)
            project.qgis_project.addMapLayers([qgis_layer])
            root = project.qgis_project.layerTreeRoot()
            if qgis_layer_id not in root.findLayerIds():
                # Append layer at the end
                root.insertLayer(-1, qgis_layer)
            if not project.update_qgis_project():
                raise Exception(
                    _('Error saving the destination layer: could not write project!'))

        # Retrieve the layer again because saving the project deleted it
        qgis_layer = project.qgis_project.mapLayer(qgis_layer_id)

        # Create Layer object
        instance, created = Layer.objects.get_or_create(
            qgs_layer_id=qgis_layer_id,
            project=project,
            defaults={
                'origname': new_layer_name,
                'name': new_layer_name,
                'title': new_layer_name,
                'is_visible': True,
                'layer_type': provider,
                'srid': 4326,
                'datasource': layer_uri,
                'geometrytype': 'Polygon',
                # TODO: make this a property of the Layer object
                'database_columns': str([{'name': f.name(), 'type': QVariant.typeToName(f.type()).upper(), 'label': f.displayName()} for f in qgis_layer.fields()]),
            })

        if not created:
            raise Exception(
                _('Error adding destination Layer to the project: layer already exists.'))

        # for OGR (already filled with features) returns the id of the new layer
        if driverName is not None:
            return qgis_layer_id

    # Append to an existing layer
    qgis_layer = project.qgis_project.mapLayer(qgis_layer_id)
    if qgis_layer is None:
        raise Exception(
            _('Error opening destination layer %s: layer not found in QGIS project!' % qgis_layer_id))

    features = QgsJsonUtils.stringToFeatureList(
        geojson, fields)

    compatible_features = []
    for f in features:
        compatible_features.extend(
            QgsVectorLayerUtils.makeFeatureCompatible(f, qgis_layer))

    if qgis_layer.crs().isValid() and qgis_layer.crs() != QgsCoordinateReferenceSystem(4326):
        ct = QgsCoordinateTransform(QgsCoordinateReferenceSystem(
            4326), qgis_layer.crs(), project.qgis_project)
        for f in compatible_features:
            geom = f.geometry()
            if geom.transform(ct) != QgsGeometry.Success:
                raise Exception(
                    _('Error transforming geometry from 4326 to destination layer CRS.'))
            f.setGeometry(geom)

    if len(compatible_features) == 0:
        raise Exception(_('No compatible features returned from isochrone.'))

    if not qgis_layer.startEditing():
        raise Exception(_('Destination layer is not editable.'))

    # Add features to the layer
    if not qgis_layer.addFeatures(compatible_features):
        raise Exception(_('Error adding features to the destination layer.'))

    if not qgis_layer.commitChanges():
        raise Exception(
            _('Error committing features to the destination layer.'))

    if style is not None:
        with QgisProjectFileLocker(project) as project:
            apply_style(qgis_layer, style, False, name)
            project.update_qgis_project()

    return qgis_layer_id


def isochrone_from_layer(input_qgis_layer_id, profile, params, project_id, qgis_layer_id, connection_id, new_layer_name, name, style, process_info=None):
    """Generate isochrones asynchronously from an input QGIS point layer.
    This function must be run as an asynchronous task.

    Expected params (dict):

        {
            "locations" null,  // <-- will be populated in batches by the function
            "range_type":"time",
            "range":[480],
            "interval":60,
            "location_type":"start",
            "attributes":[
                "area",
                "reachfactor",
                "total_pop"
            ]
        }

    * "range": Maximum range value of the analysis in seconds for time and metres for distance.
               Alternatively a comma separated list of specific single range values.

    * "locations": The locations to use for the route as an array of longitude/latitude pairs

    Returns:

        - in case of errors:

        {
            'result': False,
            'error': 'error message'
        }

        - in case of success

        {
            'result': True,
            'qgis_layer_id': qgis_layer_id
        }

    :param input_qgis_layer_id: QGIS layer ID of the points layer which contains the locations for the isochrones
    :type input_qgis_layer_id: str
    :param profile: ORS profile (such as `driving-car`)
    :type profile: str
    :param params: ORS params
    :type profile: str
    :param project_id: QDjango Project pk for the new or the existing layer
    :type project_id: int
    :param qgis_layer_id: optional, QGIS layer id
    :type qgis_layer_id: QGIS layer id
    :param connection_id: optional, connection id or the special value `__shapefile__`, `__spatialite__` or `__geopackage__`
    :type connection: str
    :param new_layer_name: optional, name of the new layer
    :type new_layer_name: str
    :param name: optional, name of the isochrone, default to current datetime
    :type name: str
    :param style: optional, dictionary with style properties: example {'color': [100, 50, 123], 'transparency': 0.5, 'stroke_width: 3 }
    :type style: dict
    :param process_info: optional Huey process information
    :type process_info: ProcessInfo
    :raises Exception: raise on error
    :rtype: dict

    """

    project = get_object_or_404(Project, pk=project_id)

    # Loop through features from the layer
    input_layer = project.qgis_project.mapLayer(input_qgis_layer_id)

    # Check preconditions
    assert input_layer is not None and input_layer.geometryType() == QgsWkbTypes.PointGeometry

    # Store range
    rang = params['range']

    req = QgsFeatureRequest()
    req.setNoAttributes()

    ct = QgsCoordinateTransform(
        input_layer.crs(), QgsCoordinateReferenceSystem(4326), project.qgis_project.transformContext())

    # Collect point batches
    points = []

    def _process_batch(points, qgis_layer_id):
        #import time; time.sleep(20)
        params['locations'] = points
        # Note: passing a range list is mutually exclusive
        # with "interval"
        result = isochrone(profile, params)

        if result.status_code != status.HTTP_200_OK:
            jcontent = json.loads(result.content.decode('utf-8'))
            try:
                error_message = jcontent['error']['message']
            except (KeyError, TypeError):
                error_message = jcontent['error']
            raise Exception(
                _('Error generating isochrone: %s.') % error_message)
        return add_geojson_features(result.content.decode(
            'utf-8'), project, qgis_layer_id, connection_id, new_layer_name, name, style)

    feature_count = input_layer.featureCount()

    if process_info is not None:
        process_info.update_total(feature_count)

    for f in input_layer.getFeatures(req):
        g = f.geometry()
        if ct.isValid():
            g.transform(ct)
        for point in g.constParts():
            points.append([point.x(), point.y()])
            if len(points) >= ORS_MAX_LOCATIONS:
                qgis_layer_id = _process_batch(points, qgis_layer_id)
                connection_id = None
                style = None
                points = []

        if process_info is not None:
            process_info.update(n=1)

    if len(points) > 0:
        qgis_layer_id = _process_batch(points, qgis_layer_id)

    if qgis_layer_id is None:
        raise Exception(
            _('Unknown error adding results to the destination layer.'))

    return {'qgis_layer_id': qgis_layer_id}
