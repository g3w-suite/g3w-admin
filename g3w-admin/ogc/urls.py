from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *


urlpatterns = [
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/$', login_required(OgcProjectListView.as_view()), name='ogc-project-list'),
    url(r'^(?P<group_slug>[-_\w\d]+)/project/add/$', login_required(OgcProjectCreateView.as_view()), name='ogc-project-add'),
]