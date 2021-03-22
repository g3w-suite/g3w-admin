# coding=utf-8
""""API Views for operouteservice G3W-Suite plugin

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-21'
__copyright__ = 'Copyright 2021, ItOpen'


import json
import os

from core.api.views import G3WAPIView
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import Http404, get_object_or_404
from django.utils.translation import ugettext_lazy as _
from django.views.generic import View
from openrouteservice.utils import (add_geojson_features, db_connections,
                                    is_ors_compatible, isochrone)
from qdjango.mixins.views import QdjangoProjectViewMixin
from qdjango.models import Project
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from rest_framework.exceptions import ValidationError
from core.api.authentication import CsrfExemptSessionAuthentication
from .permissions import IsochroneCreatePermission


OSR_MAX_LOCATIONS = getattr(settings, 'OSR_MAX_LOCATIONS', 10)
OSR_MAX_RANGES = getattr(settings, 'OSR_MAX_RANGES', 10)


class OpenrouteserviceCompatibleLayersView(G3WAPIView):
    """Returns a list of openrouteservice compatible layer IDs
    """

    permission_classes = (
        IsochroneCreatePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, *args, project_id):
        """Returns a JSON list of openrouteservice compatible layer IDs and DB connections"""

        self.project = get_object_or_404(Project, pk=project_id)
        compatible = []
        connections = []

        for layer_id, layer in self.project.qgis_project.mapLayers().items():
            if is_ors_compatible(layer):
                compatible.append(layer_id)

        connections = db_connections(self.project.qgis_project)

        return Response({
            'compatible': compatible,
            'connections': list(connections.values())
        })


class OpenrouteServiceIsochroneView(G3WAPIView):
    """Create isochrone"""

    permission_classes = (
        IsochroneCreatePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, project_id):
        """Returns the (possibly) new layer ID where the isochrone was added.
        The destination layer can be specified in two different alternative ways:

        1. QGIS layer id: the id of a compatible layer that already exists in the current project.
        2. A connection id (see the "connections" returned by OpenrouteserviceCompatibleLayersView)
           plus a name for the new layer to be created. Special connection values can be used to create
           new filesystem-based layer: '__shapefile__', '__spatialite__', '__geopackage__'.

        In both cases a "color" and "transparency" may be specified, if the destination layer is
        a new layer the style will be applied automatically, if the destination layer is an existing
        one, the existing style will not be overwritten and the logic will try to create a new
        rule in case of a rule-based renderer, the new style will be ignored in all other situations.

        Sample JSON request:

        {
            // Append to existing layer
            'qgis_layer_id': 'layer_id', // QGIS vector layer id, mutually exclusive with connection_id
            // In case of new layer:
            'connection_id': null, // mutually exclusive with layer_id
            'new_layer_name': null, // mutually exclusive with layer_id
            '': null, // mutually exclusive with layer_id
            'profile': "driving-car",
            'color': [<red>, <green>, <blue>],  // 0-255 RGB values
            'transparency': 0.5, // 0-1, 0: fully opaque, 1: fully transparent
            'pen_width': 1, // integer
            // This goes straight to ORS API
            'ors': {
                "locations":[[10.859513,43.401984]],
                "range_type":"time",  // Time or distance
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
            raise ValidationError(str(ex))

        project = get_object_or_404(Project, pk=project_id)

        # Alternatives:
        qgis_layer_id = body['qgis_layer_id']
        # ... or
        new_layer_name = body['new_layer_name']
        connection_id = body['connection_id']

        # Metadata (isochrone name)
        try:
            name = body['name']
        except KeyError:
            name = None

        # Style information (optional)
        try:

            color = body['color']

            if type(color) != list or len(color) != 3:
                raise ValidationError(_(
                    'Wrong color parameter, color must be a list of three integers (red, green, blue).'))

            for c in color:
                if type(c) != int or c < 0 or c > 255:
                    raise ValidationError(_(
                        'Wrong color parameter, color must be a list of three integers (red, green, blue).'))

            try:
                transparency = body['transparency']
            except KeyError:
                raise ValidationError(_(
                    'Missing tranparency parameter, because color was specified transparency is required.'))

            try:
                transparency = float(transparency)
                if transparency < 0 or transparency > 1:
                    raise Exception
            except:
                raise ValidationError(_(
                    'Wrong tranparency parameter, transparency must be between 0 and 1.'))

        except KeyError:

            transparency = None
            color = None

        if qgis_layer_id:
            qgis_layer = project.qgis_project.mapLayer(qgis_layer_id)
            if qgis_layer is None or not is_ors_compatible(qgis_layer):
                raise ValidationError(_(
                    'Layer is not compatible with ORS data.'))
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
                    raise ValidationError(_('Wrong connection_id.'))
            qgis_layer = None
        else:
            raise ValidationError(_(
                'Either qgis_layer_id or connection_id + layer_name must have a value.'))

        # Validate input
        try:
            profile = body['profile']
            ors = body['ors']
            locations = ors['locations']
            ranges = ors['range']

            if not profile in settings.ORS_PROFILES:
                raise ValidationError(_(
                    'Profile not found, available profiles: %s') % ', '.join(settings.ORS_PROFILES))

            if len(locations) > OSR_MAX_LOCATIONS:
                raise ValidationError(_(
                    'Max allowed locations: %s') % OSR_MAX_LOCATIONS)

            for location in locations:
                if type(location[0]) not in (float, int) or type(location[1]) not in (float, int) or len(location) != 2:
                    raise ValidationError(_('Malformed locations array.'))

            if len(ranges) > OSR_MAX_RANGES:
                raise ValidationError(_(
                    'Max allowed ranges: %s') % OSR_MAX_RANGES)

            for rang in ranges:
                if type(rang) != int:
                    raise ValidationError(_('Malformed range array.'))

        except Exception as ex:
            raise ValidationError(str(ex))

        # Call ORS
        params = ors

        try:
            result = isochrone(profile, params)
        except Exception as ex:
            return Response({'result': False, 'error': str(ex)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if result.status_code == 200:
            try:
                qgis_layer_id = add_geojson_features(result.content.decode(
                    'utf-8'), project, qgis_layer_id, connection, new_layer_name, name)

                # Apply style

            except Exception as ex:
                return Response({'result': False, 'error': str(ex)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'result': True, 'qgis_layer_id': qgis_layer_id})
        else:
            return Response({'result': False, 'error': result.json()['error']['message']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
