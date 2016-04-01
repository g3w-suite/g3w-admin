from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [

    #for config
    url(r'^dashboard/$', login_required(DashboardView.as_view()), name='iternet-dashboard'),
    url(r'^download/qgispgconnection/$', login_required(DownloadQgisPgConnectionView.as_view()), name='iternet-download-qgispgconnection-file'),
    url(r'^config/$', login_required(ConfigView.as_view()), name='iternet-config'),
    url(r'^api/editing/(?P<layer_name>[-_\w\d]+)/$', login_required(ElementoStradaleApiView.as_view()), name='iternet-api-editing'),
]
