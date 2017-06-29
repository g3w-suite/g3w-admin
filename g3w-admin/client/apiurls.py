from django.conf.urls import url
from .api.views import *
from .views import ClientView

urlpatterns = [

    # api urls
    #test djangorest framework
    url(r'^api/initconfig/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)$',
        GroupConfigApiView.as_view(), name='group-map-config'),
    url(r'^api/config/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)$',
        ClientConfigApiView.as_view(), name='group-project-map-config'),
    url(r'^api/search/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/(?P<widget_id>[-_\w\d]+)$',
        ClientSearchApiView.as_view(), name='group-project-search')
]
