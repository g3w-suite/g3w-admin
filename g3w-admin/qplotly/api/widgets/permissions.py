# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-23'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from qdjango.models.projects import Layer
from qplotly.models import QplotlyWidget


class QplotlyWidgetPermission(BasePermission):
    """
    API permission for Qplotly urls
    Allows access only to users have permission change_project on project
    """

    def has_permission(self, request, view):

        # case every constraint only for admin user
        if request.user.is_superuser:
            return True

        try:
            if request.method in ('POST'):
                if 'layer' in request.POST:
                    # case Constraint API list
                    layer = Layer.objects.get(pk=request.POST['layer'])
                elif 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(pk=view.kwargs['layer_id'])
                else:
                    return False

            else:
                # case: GET, PUT, DELETE
                if 'pk' in view.kwargs and 'project_id' in view.kwargs:
                    # for this controll is necessary have project_id
                    layer = QplotlyWidget.objects.get(pk=view.kwargs['pk']).\
                        layers.filter(project_id=view.kwargs['project_id'])[0]
                elif 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(id=view.kwargs['layer_id'])
                else:
                    return False

            # check change_layer permission on qgis layer
            return request.user.has_perm('qdjango.change_project', layer.project)

        except ObjectDoesNotExist:
            return False