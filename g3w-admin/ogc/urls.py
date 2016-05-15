from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *


urlpatterns = [
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/$', login_required(OgcProjectListView.as_view()), name='ogc-project-list'),
    url(r'^(?P<group_slug>[-_\w\d]+)/project/add/$', login_required(OgcProjectCreateView.as_view()), name='ogc-project-add'),

    # store urls:
    url(r'^stores/$', login_required(OgcStoreListView.as_view()),
        name='ogc-store-list'),
    url(r'^stores/add$', login_required(OgcStoreCreateView.as_view()),
        name='ogc-store-add'),
    url(r'^stores/detail/(?P<slug>[-_\w\d]+)$', login_required(OgcStoreDetailView.as_view()),
        name='ogc-store-detail'),
    url(r'^stores/update/(?P<slug>[-_\w\d]+)$', login_required(OgcStoreUpdateView.as_view()),
        name='ogc-store-update'),
    url(r'^stores/(?P<slug>[-_\w\d]+)$', login_required(OgcStoreDeleteView.as_view()),
        name='ogc-store-delete'),

]