# coding=utf-8
""""
    Serializer for project bookmarks per user
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-09-22 10:39:43'
__copyright__ = 'Copyright Gis3w'

from django.http import QueryDict
from rest_framework.serializers import ModelSerializer, ValidationError
from rest_framework.fields import empty
from qdjango.models import ProjectBookmark

class ProjectBookmarkSerializer(ModelSerializer):
    """
    Serializer for project bookmarks per user
    """

    def __init__(self, instance=None, data=empty, **kwargs):

        if data != empty and isinstance(data, QueryDict):
            data = data.dict()

        # Add user from context
        if data != empty:
            data['user'] = str(kwargs['context']['request'].user.id)
        
        super().__init__(instance, data, **kwargs)

    def validate_project(self, value):
        """
        Check that the user has grant view on project
        """

        user = self.context['request'].user
        if not user.has_perm('projects.view_project', value):
            raise ValidationError("You do not have permission to view this project.")
        return value


    class Meta:
        model = ProjectBookmark
        fields = ['id', 'user', 'project']
        #read_only_fields = ['id', 'user']  # user is set from the request context

    

