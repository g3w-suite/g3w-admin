# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


import base64
from core.api.authentication import CsrfExemptSessionAuthentication
from core.api.views import G3WAPIView
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.translation import ugettext_lazy as _
from qdjango.models import Layer
from rest_framework import generics
from rest_framework.exceptions import APIException, NotFound, ValidationError, ParseError
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from usersmanage.utils import (get_user_groups_for_object,
                               get_viewers_for_object)

from .permissions import LayerInfoPermission, LayerStylesManagePermission
from .serializers import LayerInfoAuthGroupSerializer, LayerInfoUserSerializer


class StyleNotFoundError(NotFound):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = _('Style not found.')
    default_code = 'style_not_found'


class StyleConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = _('A style with this name already exists.')
    default_code = 'style_name_conflict'


class LayerUserInfoAPIView(generics.ListAPIView):
    """For a qdjango layer id return users and users_groups (viewers) can be view project of it"""

    queryset = Layer.objects.all()
    serializer_class = LayerInfoUserSerializer

    permission_classes = (
        LayerInfoPermission,
    )

    def get_queryset(self):
        """
        This view should return a list of user with view_project permission.
        """
        if 'layer_id' in self.kwargs:

            # get 'context' GET parameter if is present possible values: [v (view), e (editing), ve (view + editing)]
            context = self.request.GET.get('context', 'v')

            # get viewer users
            layer = Layer.objects.get(pk=self.kwargs['layer_id'])
            with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)

            if context == 'e':

                # get viewer users with change_layer grant
                qs = get_viewers_for_object(layer, self.request.user, 'change_layer',
                                                with_anonymous=with_anonymous)
            else:

                # get viewer users with view_project and change_layer
                qs = get_viewers_for_object(layer.project, self.request.user, 'view_project',
                                                 with_anonymous=with_anonymous)

        else:
            qs = []

        return qs


class LayerAuthGroupInfoAPIView(generics.ListAPIView):
    """For a qdjango layer id, return users_groups (viewers) can be view project of it"""

    queryset = Layer.objects.all()
    serializer_class = LayerInfoAuthGroupSerializer

    permission_classes = (
        LayerInfoPermission,
    )

    def get_queryset(self):
        """
        This view should return a list o users groups with view_project permission.
        """

        if 'layer_id' in self.kwargs:

            # get 'context' GET parameter if is present possible values: [v (view), e (editing), ve (view + editing)]
            context = self.request.GET.get('context', 'v')

            # get viewer users
            layer = Layer.objects.get(pk=self.kwargs['layer_id'])

            if context == 'e':

                # get viewer user groups with change_layer grant
                qs = get_user_groups_for_object(layer, self.request.user, 'change_layer', 'viewer')
            else:

                # get viewer user groups with view_project and change_layer
                qs = get_user_groups_for_object(layer.project, self.request.user, 'view_project', 'viewer')
        else:
            qs = None
        return qs


class LayerStyleBaseView(G3WAPIView):
    """Base class for style API views"""

    permission_classes = (LayerStylesManagePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, layer_id, style_name=None, format=None):
        """Returns a list of styles or a single style if style_name is defined

        :param layer_id: QDjango Layer object pk
        :type layer_id: int
        :return: Response
        :rtype: REST framework Response object json
        :raises LayerNotFoundException
        """

        layer = get_object_or_404(Layer, pk=layer_id)

        if not style_name:
            return Response({'result': True, 'styles': layer.styles}, content_type='application/json')
        else:
            for s in layer.styles:
                if s['name'] == style_name:
                    return Response({'result': True, 'style': s}, content_type='application/json')

        return Response({'error': _('Style not found.')}, status=status.HTTP_404_NOT_FOUND, content_type='application/json')


class LayerStyleListView(LayerStyleBaseView):
    """REST views to manage layer styles:

    - list styles

    """

    permission_classes = (LayerStylesManagePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, layer_id, style_name=None, format=None):
        """Returns a list of styles

        :param layer_id: QDjango Layer object pk
        :type layer_id: int
        :return: Response
        :rtype: REST framework Response object json
        :raises LayerNotFoundException
        """

        return super().get(request, layer_id, style_name, format)

    def post(self, request, layer_id, format=None):
        """Create a new style

        Accepted body:

        {
            'name': '<new name>',
            'qml': '<uploaded QML>'
        }

        :param layer_id: QDjango Layer object pk
        :type layer_id: int
        :return: Response
        :rtype: REST framework Response object json
        :raises LayerNotFoundException
        """

        layer = get_object_or_404(Layer, pk=layer_id)
        try:
            if request.content_type.startswith('application/json'):
                qml = request.data['qml']
            else:
                qml = request.data['qml'].read().decode('utf-8')
            if not len(qml) > 0:
                # This is catched below
                raise ParseError()
        except:
            raise ParseError(_('Error parsing QML'))

        try:
            name = request.data['name']
        except:
            raise ValidationError(_('Error parsing style name'))

        if name in [s['name'] for s in layer.styles]:
            raise StyleConflictError()

        if layer.add_style(name, qml):
            return Response({'result': True}, content_type='application/json', status=status.HTTP_201_CREATED)
        else:
            raise ValidationError(_('Error creating new style'))


class LayerStyleDetailView(LayerStyleBaseView):
    """REST views to manage layer styles:

    - style detail
    - create new style from QML
    - rename style
    - make style current
    - delete style

    Note: operations on current style are not allowed

    """

    permission_classes = (LayerStylesManagePermission,)
    authentication_classes = (CsrfExemptSessionAuthentication,)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, layer_id, style_name, format=None):
        """Returns a single style

        :param layer_id: QDjango Layer object pk
        :type layer_id: int
        :param style_name: QGIS layer style name
        :type style_name: str
        :return: Response
        :rtype: REST framework Response object json
        :raises LayerNotFoundException
        """

        return super().get(request, layer_id, style_name, format)

    def patch(self, request, layer_id, style_name, format=None):
        """Modify a single style (if the style is not current).

        Accepted body (at least one of the arguments must be present):

        {
            'name': '<new name>',
            'current': <bool>,
            'qml': '<uploaded QML>'
        }

        Note: is is not possible to change the name of the current style and
        it is not possible to change the "current" status from True to False, it is
        only possible to change the "current" status from False to True.

        :param layer_id: QDjango Layer object pk
        :type layer_id: int
        :param style_name: QGIS layer style name
        :type style_name: str
        :return: Response
        :rtype: REST framework Response object json
        :raises LayerNotFoundException
        """

        layer = get_object_or_404(Layer, pk=layer_id)

        result = True

        try:
            new_name = request.data['name']
        except:
            new_name = None

        if not result:
            raise APIException(_('Error renaming the style'))

        try:
            new_current_status = request.data['current']
        except:
            new_current_status = None

        if 'qml' in request.data.keys():
            try:
                if request.content_type.startswith('application/json'):
                    qml = request.data['qml']
                else:
                    qml = request.data['qml'].read().decode('utf-8')
                if len(qml) == 0:  # empty QML is allowed for patch
                    qml = None
            except:
                raise ParseError(_('Error parsing QML'))
        else:
            qml = None

        if new_current_status is None and new_name is None and qml is None:
            raise ValidationError(
                _('Either "name" or "current" or "qml" needs to be specified.'))

        try:
            is_current = [s for s in layer.styles if s['name']
                          == style_name][0]['current']
        except:
            raise StyleNotFoundError()

        if is_current:
            raise ValidationError(
                _('Modifications of the current style are not allowed.'))

        if new_name is not None and new_name != style_name:
            result = layer.rename_style(style_name, new_name)
            style_name = new_name

        if new_current_status is not None:
            assert new_current_status
            result = result and layer.set_current_style(style_name)

        if result and qml is not None:
            result = result and layer.replace_style(style_name, qml)

        if result:
            return Response({'result': True})
        else:
            raise ValidationError(
                _('Unknown error while modifying the style.'))

    def delete(self, request, layer_id, style_name, format=None):
        """Deletes a single style

        :param layer_id: QDjango Layer object pk
        :type layer_id: int
        :param style_name: QGIS layer style name
        :type style_name: str
        :return: Response
        :rtype: REST framework Response object json
        :raises LayerNotFoundException
        """

        layer = get_object_or_404(Layer, pk=layer_id)

        if layer.delete_style(style_name):
            return Response({'result': True})
        else:
            raise ValidationError(
                _('Unknown error while modifying the style.'))
