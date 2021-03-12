# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf import settings
from rest_framework import generics
from usersmanage.utils import get_viewers_for_object, get_user_groups_for_object
from qdjango.models import Layer
from .serializers import LayerInfoUserSerializer, LayerInfoAuthGroupSerializer
from .permissions import LayerInfoPermission


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