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
from openrouteservice.utils import isochrone, add_geojson_features, db_connections, is_ors_compatible
OSR_MAX_LOCATIONS = getattr(settings, 'OSR_MAX_LOCATIONS', 10)
OSR_MAX_RANGES = getattr(settings, 'OSR_MAX_RANGES', 10)


class OpenrouteserviceCompatibleLayersView(View):
    """Returns a list of openrouteservice compatible layer IDs
    """

    def get(self, *args, project_id):
        """Returns a JSON list of openrouteservice compatible layer IDs and DB connections"""

        self.project = get_object_or_404(Project, pk=project_id)
        compatible = []
        connections = []

        for layer_id, layer in self.project.qgis_project.mapLayers().items():
            if is_ors_compatible(layer):
                compatible.append(layer_id)

        connections = db_connections(self.project.qgis_project)

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
            // Append to existing layer
            'qgis_layer_id': 'layer_id', // QGIS vector layer id, mutually exclusive with connection_id
            // In case of new layer:
            'connection_id': null, // mutually exclusive with layer_id
            'new_layer_name': null, // mutually exclusive with layer_id
            '': null, // mutually exclusive with layer_id
            'profile': "driving-car",
            // This goes straight to ORS API
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

        project = get_object_or_404(Project, pk=project_id)

        # Alternatives:
        qgis_layer_id = body['qgis_layer_id']
        # ... or
        new_layer_name = body['new_layer_name']
        connection_id = body['connection_id']

        if qgis_layer_id:
            qgis_layer = project.qgis_project.mapLayer(qgis_layer_id)
            if qgis_layer is None or not is_ors_compatible(qgis_layer):
                raise Http404
            connection = None
        elif connection_id:
            if connection_id in ('__shapefile__', '__spatialite__', '__geopackage__'):
                connection = connection_id
            else:
                connection = None
                for conn, details in db_connections(project.qgis_project).items():
                    if details['id'] == connection_id:
                        connection = conn
                        break
                if connection is None:
                    raise Http404
            qgis_layer = None
        else:
            return HttpResponseBadRequest({'error': _('Either qgis_layer_id or connection_id + layer_name must have a value.')})

        # Validate input
        try:
            profile = body['profile']
            ors = body['ors']
            locations = ors['locations']
            ranges = ors['range']

            if not profile in settings.ORS_PROFILES:
                return HttpResponseBadRequest({'error': _('Profile not found, available profiles: %s') % ', '.join(settings.ORS_PROFILES)})

            if len(locations) > OSR_MAX_LOCATIONS:
                return HttpResponseBadRequest({'error': _('Max allowed locations: %s') % OSR_MAX_LOCATIONS})

            for location in locations:
                if type(location[0]) not in (float, int) or type(location[1]) not in (float, int) or len(location) != 2:
                    return HttpResponseBadRequest({'error': _('Malformed locations array.')})

            if len(ranges) > OSR_MAX_RANGES:
                return HttpResponseBadRequest({'error': _('Max allowed ranges: %s') % OSR_MAX_RANGES})

            for rang in ranges:
                if type(rang) != int:
                    return HttpResponseBadRequest({'error': _('Malformed range array.')})

        except Exception as ex:
            return HttpResponseBadRequest({'error': str(ex)})

        # Call ORS
        params = ors
        
        try:
            result = isochrone(profile, params)
        except Exception as ex:
            return JsonResponse({'result': False, 'error': str(ex)}, status=500)

        if result.status_code == 200:
            try:
                qgis_layer_id = add_geojson_features(result.content.decode(
                    'utf-8'), project, qgis_layer_id, connection, new_layer_name)
            except Exception as ex:
                return JsonResponse({'result': False, 'error': str(ex)}, status=500)

            return JsonResponse({'result': True, 'qgis_layer_id': qgis_layer_id})
        else:
            return JsonResponse({'result': False, 'error': result.json()['error']['message']}, status=500)
