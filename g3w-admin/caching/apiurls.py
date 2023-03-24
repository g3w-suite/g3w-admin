"""
Add your API routes here.
"""
# API ROOT: /caching/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path

from .views import TileStacheTileApiView


urlpatterns = [

    re_path(
        r'^api/(?P<layer_name>[-\w]+)/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+).(?P<extension>\w+)$',
        TileStacheTileApiView.as_view(),
        name='caching-api-tile'
    ),

]
