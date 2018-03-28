from django.conf.urls import url
from .views import *

urlpatterns = [
    url(r'^ows/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/$', OWSView.as_view(),
        name='ows')
]
