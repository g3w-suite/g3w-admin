# coding=utf-8
""""
    API REST views for project bookmarks per user
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-09-22 10:30:32'
__copyright__ = 'Copyright Gis3w'


from django.shortcuts import get_object_or_404
from core.api.authentication import CsrfExemptSessionAuthentication
from qdjango.models import ProjectBookmark
from .serializers import ProjectBookmarkSerializer


from rest_framework.generics import ListCreateAPIView
    
from rest_framework.mixins import (
    UpdateModelMixin, 
    DestroyModelMixin
)

class ProjectBookmarkCRUDAPIView(DestroyModelMixin, UpdateModelMixin, ListCreateAPIView):
    """
    API for project bookmarks per user
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    serializer_class = ProjectBookmarkSerializer

    def put(self, request, *args, **kwargs):

        return self.update(request, *args, **kwargs)
    
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

    def get_queryset(self):
        """
        Return bookmarks for the current user and project"""

        user = self.request.user

        return ProjectBookmark.objects.filter(user=user)
    
    def get_object(self):
        
        queryset = self.filter_queryset(self.get_queryset())


        project_id = self.request.data.get('project')

        filter_kwargs = {'project_id': project_id}
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj