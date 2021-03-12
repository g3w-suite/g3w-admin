# coding=utf-8
""""
    Ddjango APi layer permissions classes.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import ValidationError, NotFound
from qdjango.models import Layer
from django.shortcuts import get_object_or_404

class LayerInfoPermission(BasePermission):
    """
    API permission for Qdjango Layer Info and Layer User Info urls
    Allows access only to users have permission change_project on project layer parent.
    """

    def has_permission(self, request, view):

        try:
            layer = Layer.objects.get(pk=view.kwargs['layer_id'])
        except ObjectDoesNotExist:
            raise ValidationError('Layer id is not set.')

        # check change_layer permission on qgis layer
        return request.user.has_perm('qdjango.change_project', layer.project)


class LayerStylesManagePermission(BasePermission):
    """
    API permission for Qdjango Layer change styles
    Allows access only to users have permission change_project on project layer parent.
    """

    def has_permission(self, request, view):

        layer = get_object_or_404(Layer, pk=view.kwargs['layer_id'])
        # check change_layer permission on qgis layer
        return request.user.has_perm('qdjango.change_project', layer.project)