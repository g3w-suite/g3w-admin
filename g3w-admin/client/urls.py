from django.conf.urls import url
from .views import *

urlpatterns = [

    # g3w-client bootstrap
    url(r'^map/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/$', ClientView.as_view(),
        name='group-project-map'),
    url(r'^map/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/$',
        ClientView.as_view(), name='group-project-slug-map'),

    url(r'^me/(?P<project_type>[-_\w\d]+)/(?P<layer_md5_resource>[-_\w\d]+)/(?P<file_name>[-_.\w\d]+)',
        user_media_view, name='user-media'),
]
