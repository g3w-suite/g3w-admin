# coding=utf-8
""""API Views for operouteservice G3W-Suite plugin

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-21'
__copyright__ = 'Copyright 2021, ItOpen'


import json
import os

from core.api.authentication import CsrfExemptSessionAuthentication
from core.api.views import G3WAPIView
from django.conf import settings
from django.shortcuts import Http404, get_object_or_404
from django.utils.translation import gettext_lazy as _
from django.views.generic import View
from huey.contrib.djhuey import HUEY
from huey.exceptions import TaskException
from huey_monitor.models import TaskModel
from openrouteservice.tasks import isochrone_from_layer_task
from openrouteservice.utils import (add_geojson_features, config,
                                    get_db_connections, is_ors_compatible,
                                    isochrone)
from qdjango.mixins.views import QdjangoProjectViewMixin
from qdjango.models import Layer, Project
from qgis.core import QgsWkbTypes
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .permissions import IsochroneCreatePermission

ORS_MAX_LOCATIONS = getattr(settings, 'ORS_MAX_LOCATIONS', 2)
ORS_MAX_RANGES = getattr(settings, 'ORS_MAX_RANGES', 6)


class OpenrouteserviceCompatibleLayersView(G3WAPIView):
    """Returns a list of openrouteservice compatible layer IDs
    """

    permission_classes = (
        IsochroneCreatePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, *args, project_id):
        """Returns a JSON list of openrouteservice compatible layer IDs and DB connections"""

        project = get_object_or_404(Project, pk=project_id)

        return Response(config(project))


class OpenrouteServiceIsochroneBaseView(G3WAPIView):
    """Create isochrone from coordinates or from an input layer.

    Warning: this view is not meant to be called directly, use the subclasses instead.

    """

    permission_classes = (
        IsochroneCreatePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _post(self, request, project_id, layer_id=None):
        """Returns the (possibly) new layer ID where the isochrone was added and a task ID in case
        of asynchronous processing (input from point layer).

        The destination layer can be specified in two different alternative ways:

        1. QGIS layer id: the id of a compatible layer that already exists in the current project.
        2. A connection id (see the "connections" returned by OpenrouteserviceCompatibleLayersView)
           plus a name for the new layer to be created. Special connection values can be used to create
           new filesystem-based layer: '__shapefile__', '__spatialite__', '__geopackage__'.

        In both cases a "color" and "transparency" may be specified, if the destination layer is
        a new layer the style will be applied automatically, if the destination layer is an existing
        one, the existing style will not be overwritten and the logic will try to create a new
        rule in case of a rule-based renderer, the new style will be ignored in all other situations.

        The input coordinates can be specified by passing 'locations' or by passing `layer_id` in args.

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
            'name' : 'name of the new isochrone',
            'stroke_width': 0.26, // float, QGIS default is 0.26
            // This goes straight to ORS API
            'ors': {
                "locations":[[10.859513,43.401984]],  // May be null in case of `layer_id`
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
            if request.content_type == 'application/x-www-form-urlencoded':
                body = json.loads(request.data['_content'])
            else:
                body = json.loads(request.body.decode('utf-8'))
        except Exception as ex:
            raise ValidationError(str(ex))

        project = get_object_or_404(Project, pk=project_id)

        if layer_id is not None:
            layer = get_object_or_404(Layer, pk=layer_id, project=project)
            is_task = True
            # Validate input layer
            if layer.qgis_layer.geometryType() != QgsWkbTypes.PointGeometry:
                raise ValidationError(_(
                    'Input layer is not a point or multipoint layer.'))
        else:
            layer = None
            is_task = False

        # Output alternatives:
        try:
            qgis_layer_id = body['qgis_layer_id']
            new_layer_name = None
        except KeyError:
            qgis_layer_id = None

        if not qgis_layer_id:
            try:
                new_layer_name = body['new_layer_name']
                connection_id = body['connection_id']
            except KeyError:
                raise ValidationError(_(
                    'Missing "qgis_layer_id", "new_layer_name" or "connection_id".'))

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

            try:
                stroke_width = float(body['stroke_width'])
            except KeyError:
                raise ValidationError(_(
                    'Missing stroke_width from style definition.'))

            style = {
                'color': color,
                'transparency': transparency,
                'stroke_width': stroke_width,
            }

        except KeyError:

            style = None

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
                for conn, details in get_db_connections(project.qgis_project).items():
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
        profile = body['profile']

        if not profile in settings.ORS_PROFILES:
            raise ValidationError(_(
                'Profile not found, available profiles: %s') % ', '.join(settings.ORS_PROFILES))

        ors = body['ors']

        # Locations are optional for tasks
        if not is_task:

            try:
                locations = ors['locations']
            except KeyError:
                raise ValidationError(_('Missing "locations" array.'))

            if len(locations) > ORS_MAX_LOCATIONS:
                raise ValidationError(_(
                    'Max allowed locations: %s') % ORS_MAX_LOCATIONS)

            for location in locations:
                if type(location[0]) not in (float, int) or type(location[1]) not in (float, int) or len(location) != 2:
                    raise ValidationError(_('Malformed locations array.'))

        try:
            ranges = ors['range']
        except KeyError:
            raise ValidationError(_('Missing "range" array.'))

        if len(ranges) > ORS_MAX_RANGES:
            raise ValidationError(_(
                'Max allowed ranges: %s') % ORS_MAX_RANGES)

        # Fix interval for time (the interval is sent in minutes instead of seconds)
        if 'interval' in ors and ors["range_type"] == "time":
            ors['interval'] = ors['interval'] * 60

        for rang in ranges:
            if type(rang) != int:
                raise ValidationError(_('Malformed range array.'))

        # Call ORS
        params = ors

        if not is_task:
            try:
                result = isochrone(profile, params)
                if result.content == b'':
                    return Response({'result': False, 'error': 'Empty response from the Openrouteservice server, please check your input values.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as ex:
                return Response({'result': False, 'error': str(ex)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if result.status_code == status.HTTP_200_OK:
                try:
                    qgis_layer_id = add_geojson_features(result.content.decode(
                        'utf-8'), project, qgis_layer_id, connection, new_layer_name, name, style)

                except Exception as ex:
                    return Response({'result': False, 'error': str(ex)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                return Response({'result': True, 'qgis_layer_id': qgis_layer_id})
            else:
                # Handle case where there is no "message"
                try:
                    return Response({'result': False, 'error': result.json()['error']['message']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                except TypeError:
                    return Response({'result': False, 'error': result.json()['error']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            # Create async task
            input_qgis_layer_id = layer.qgis_layer.id()
            task = isochrone_from_layer_task(input_qgis_layer_id, profile, params,
                                             project.pk, qgis_layer_id, connection, new_layer_name, name, style)
            return Response({'result': True, 'task_id': task.id})


class OpenrouteServiceIsochroneView(OpenrouteServiceIsochroneBaseView):
    """Create isochrone from coordinates"""

    def post(self, request, project_id):
        """Returns the (possibly) new layer ID where the isochrone was added."""

        return self._post(request, project_id)


class OpenrouteServiceIsochroneFromLayerView(OpenrouteServiceIsochroneBaseView):
    """Create isochrones from a point layer asynchronously"""

    def post(self, request, project_id, layer_id):
        """Returns the asynchronous task id."""

        return self._post(request, project_id, layer_id)


class OpenrouteServiceIsochroneFromLayerResultView(OpenrouteServiceIsochroneBaseView):

    def get(self, request, project_id, task_id):
        """Returns the (possibly) new layer ID where the isochrone
        data has been added. If the task has not yet completed a status message is returned

        Note: `project_id` is only used for permissions checking!

        Returns 500 in case of exceptions
        Returns 404 in case of task not found
        Returns 200 ok for all other cases

        Response body:

        {
            "status": "complete",  // or "pending" or "error", full list at
                                   // https://huey.readthedocs.io/en/latest/signals.html#signals
            "exception": "Normally empty, error message in case of errors",
            "progress": [
                100,  // Progress %
            ],
            "task_result": {
                "qgis_layer_id": "4f2a88a1-ca93-4859-9de3-75d9728cde0e"
            }
        }

        TODO: move this into core, make it generic for task status and result reporting

        """

        try:

            # Try to retrieve the task result, may throw an exception
            try:
                result = HUEY.result(task_id)
                ret_status = status.HTTP_200_OK
            except TaskException:
                result = None
                ret_status = status.HTTP_500_INTERNAL_SERVER_ERROR

            task_model = TaskModel.objects.get(task_id=task_id)
            progress_info = task_model.progress_info

            try:
                progress_percentage = int(
                    100 * progress_info[0] / task_model.total)
            except:
                progress_percentage = 0

            try:
                return Response({
                    'status': task_model.state.signal_name,
                    'exception': task_model.state.exception_line,
                    'progress': progress_percentage,
                    'task_result': result
                }, status=ret_status)
            except:
                return Response({
                    'status': 'error',
                    'exception': 'Error retrieving task informations',
                    'progress': 0,
                    'task_result': result,
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except TaskModel.DoesNotExist:

            # Handle pending
            pending_task_ids = [task.id for task in HUEY.pending()]

            if task_id in pending_task_ids:
                return Response({'result': True, 'status': 'pending'})

            return Response({'result': False, 'error': _('Task not found!')}, status=status.HTTP_404_NOT_FOUND)
