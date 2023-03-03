from django.urls import re_path
from django.contrib.auth.decorators import login_required
from .api.views import layer_commit_vector_view

from .api.info.views import *

BASE_URLS = 'vector'

urlpatterns = [
    re_path(
        r'^api/(?P<mode_call>editing|commit|unlock)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_commit_vector_view,
        name='editing-commit-vector-api'
    )
]

# Editing info
urlpatterns += [
    # Other vector layers in project get by qdjango layer id
    re_path(
        r'^api/info/layer/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(EditingLayerInfo.as_view()),
        name='editing-api-info-layer'
    ),

    # Viewers users can editing on editing layer id
    re_path(
        r'^api/info/layer/user/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(EditingLayerUserInfo.as_view()),
        name='editing-api-info-layer-user'
    ),

    # Viewers users groups viewer can editing on editing layer id
    re_path(
        r'^api/info/layer/authgroup/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(EditingLayerAuthGroupInfo.as_view()),
        name='editing-api-info-layer-authgroup'
    ),
]

