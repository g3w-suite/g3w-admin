# coding=utf-8
"""" Qes api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'

from core.api.base.views import G3WAPIView
from core.api.permissions import ProjectPermission
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from qdjango.models import Project
from qdjango.api.projects.permissions import ProjectIsActivePermission
from qes.utils.indexer import QGISElasticsearchIndexer



class QesSearchAPIView(G3WAPIView):
    """ API view for search on Elsticsearch"""

    permission_classes = (
        ProjectPermission,
        ProjectIsActivePermission
    )

    def get(self, request, *args, **kwargs):
        """
        Get search results from Elasticsearch
        :param request: HTTP request
        :param args: arguments
        :param kwargs: keyword arguments
        :return: JSON response with search results
        """
        # Get query parameters
        if 'q' not in request.GET:
            raise ValidationError({'error': 'Missing search query parameter \'q\''})

        # Get project from request
        project = Project.objects.get(id=kwargs['project_id'])

        indexer = QGISElasticsearchIndexer('default', self.request.user)
        results = indexer.search(request.GET['q'], filters={
            'project_id': project.id
        })

        self.results.update({
            'results':results
        })
        return Response(self.results.results)