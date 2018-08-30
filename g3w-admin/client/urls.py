from django.conf.urls import url
from .views import *

USER_MEDIA_PREFIX = 'me'

urlpatterns = [

    # g3w-client bootstrap
    url(r'^map/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/$', ClientView.as_view(),
        name='group-project-map'),
    url(r'^map/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/$',
        ClientView.as_view(), name='group-project-slug-map'),

    # url for media reading upload
    url(r'^{}/(?P<project_type>[-_\w\d]+)/(?P<layer_id>[0-9]+)/(?P<file_name>[-_.\w\d]+)'
        .format(USER_MEDIA_PREFIX),
        user_media_view, name='user-media'),
]
