from django.urls import re_path
from .views import TileStacheTileApiView


urlpatterns = [
    re_path(r'^api/(?P<layer_name>[-\w]+)/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+).(?P<extension>\w+)$',
        TileStacheTileApiView.as_view(), name='caching-api-tile')
]
