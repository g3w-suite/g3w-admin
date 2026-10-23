"""
API urls for Qes module.
"""
# API ROOT: /qes/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path
from qes.api.views import QesSearchAPIView

BASE_URLS = 'qes'

urlpatterns = [
    path('api/search/<str:project_id>/',
         QesSearchAPIView.as_view(),
         name='qes-api-search'
     ),
]