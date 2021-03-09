# coding=utf-8
""""API Views for operouteservice G3W-Suite plugin

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'

import os
import json

from django.views.generic import View
from django.conf import settings
from qdjango.mixins.views import QdjangoProjectViewMixin
from django.http.response import JsonResponse
from django.utils.translation import ugettext_lazy as _
from django.http import HttpResponseBadRequest
from django.shortcuts import get_object_or_404, Http404
from qdjango.models import Project
from .models import OPENROUTESERVICE_REQUIRED_FIELDS
from qgis.core import (
    QgsDataProvider,
    QgsMapLayerType,
    QgsWkbTypes,
    QgsProviderRegistry,
    QgsDataSourceUri,
)

OSR_MAX_LOCATIONS = settings.get('OSR_MAX_LOCATIONS', 10)
OSR_MAX_RANGES = settings.get('OSR_MAX_RANGES', 10)

def _is_compatible(layer):
    """Check layer compatibility"""

    if layer.type() != QgsMapLayerType.VectorLayer or layer.readOnly() or layer.geometryType() != QgsWkbTypes.PolygonGeometry:
        return False
    fields = layer.fields()
    for field_name, field_type in OPENROUTESERVICE_REQUIRED_FIELDS.items():
        if fields.lookupField(field_name) < 0 or fields.field(fields.lookupField(field_name)).type() != field_type:
            return False
    return True


def _connections(qgis_project):
    """Returns a dictionary of DB connections in the project

    Warning: the dictionary may contain secrets (passwords), do not disclose to the client.
    """

    connections = {}
    for vector_layer in [layer for layer in qgis_project.mapLayers().values() if layer.type() == QgsMapLayerType.VectorLayer and not layer.readOnly()]:
        dp = vector_layer.dataProvider()
        if dp is not None and bool(dp.capabilities() & QgsDataProvider.Database):
            md = QgsProviderRegistry.instance().providerMetadata(dp.name())
            if md is not None:
                conn = md.createConnection(dp.uri().uri(), {})

                if conn is not None:

                    uri = QgsDataSourceUri(dp.uri())
                    conn_id = conn.uri()

                    if dp.uri().schema():
                        conn_id += ' schema=%s' % dp.uri().schema()

                    details = []
                    for detail in ('service', 'host', 'port', 'schema'):
                        if getattr(dp.uri(), detail)():
                            details.append('%s:%s' % (detail, getattr(dp.uri(), detail)()))
                    details = ', '.join(details)

                    conn_name = "{dbname} ({provider_name} {details})".format(dbname=os.path.basename(uri.database()), provider_name=dp.name(), details=details)
                    if not conn_id in connections:
                        connections[conn_id] = {
                            'id': QgsDataSourceUri.removePassword(conn.uri()),
                            'name': conn_name,
                            'provider': dp.name(),
                        }

    return connections

class OpenrouteserviceCompatibleLayersView(View):
    """Returns a list of openrouteservice compatible layer IDs
    """

    def get(self, *args, project_id):
        """Returns a JSON list of openrouteservice compatible layer IDs and DB connections"""

        self.project = get_object_or_404(Project, pk=project_id)
        compatible = []
        connections = []

        for layer_id, layer in self.project.qgis_project.mapLayers().items():
            if _is_compatible(layer):
                compatible.append(layer_id)

        connections = _connections(self.project.qgis_project)

        return JsonResponse({
            'compatible': compatible,
            'connections': list(connections.values())
        })


class OpenrouteServiceIsochroneView(View):
    """Create isochrone"""

    def post(self, request, project_id):
        """Returns the (possibly) new layer ID where the isochrone was added

        Expected JSON request:

        {
            'layer_id': 'layer_id', // mutually exclusive with connection_id
            'connection_id': null, // mutually exclusive with layer_id
            'ors': {
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
        }

        """

        try:
            body = json.loads(request.body.decode('utf-8'))
        except Exception as ex:
            return HttpResponseBadRequest({'error': str(ex)})

        self.project = get_object_or_404(Project, pk=project_id)

        qgis_layer_id = body['layer_id']
        connection_id = body['connection_id']

        if qgis_layer_id:
            layer = self.project.qgis_project.mapLayer(qgis_layer_id)
            if layer is None or not _is_compatible(layer):
                raise Http404
        elif connection_id:
            connection = None
            for conn, details in _connections(self.project).items():
                if details['id'] == connection_id:
                    connection = conn
                    break
            if connection is None:
                raise Http404
        else:
            return HttpResponseBadRequest({'error': _('Either layer_id or connection_id must have a value.')})

        # Validate OSR input
        try:
            ors = body['osr']
            locations = ors['locations']
            ranges = ors['range']

            if len(locations) > OSR_MAX_LOCATIONS:
               return HttpResponseBadRequest({'error': _('Max allowed locations: %s') % OSR_MAX_LOCATIONS})

            for location in locations:
                if type(location[0]) != float or type(location[1]) != float or len(location) != 2:
                    return HttpResponseBadRequest({'error': _('Malformed locations array.')})

            if len(ranges) > OSR_MAX_RANGES:
                return HttpResponseBadRequest({'error': _('Max allowed ranges: %s') % OSR_MAX_RANGES})

            for rang in ranges:
                if type(rang) != int:
                    return HttpResponseBadRequest({'error': _('Malformed range array.')})

            

        except Exception as ex:
            return HttpResponseBadRequest({'error': str(ex)})

        return JsonResponse({'result': True})
