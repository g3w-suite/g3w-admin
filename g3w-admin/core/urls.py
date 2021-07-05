from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from django.views.static import serve
from django.conf import settings
from sitetree.sitetreeapp import register_i18n_trees

from client.api.views import *
from .views import *


def protected_serve(request, path, document_root=None, show_indexes=False):
    return serve(request, path, document_root, show_indexes)


urlpatterns = [
    url(r'^$', login_required(DashboardView.as_view()), name='home'),

    #url(r'^test/$', login_required(TestView.as_view()), name='test'),
    #url(r'^404/$', NotFoundView.as_view(), name='404'),

    # macrogroups urls
    url(r'^macrogroups/$', login_required(MacroGroupListView.as_view()), name='macrogroup-list'),
    url(r'^macrogroups/add/$', login_required(MacroGroupCreateView.as_view()), name='macrogroup-add'),
    url(r'^macrogroups/update/(?P<slug>[-_\w\d]+)/$', login_required(MacroGroupUpdateView.as_view()),
        name='macrogroup-update'),
    url(r'^macrogroups/delete/(?P<slug>[-_\w\d]+)/$', login_required(MacroGroupDeleteView.as_view()),
        name='macrogroup-delete'),
    url(r'^macrogroups/(?P<slug>[-_\w\d]+)/$', login_required(MacroGroupDetailView.as_view()),
        name='macrogroup-detail'),

    # group urls
    url(r'^groups/$', login_required(GroupListView.as_view()), name='group-list'),
    url(r'^groups/add/$', login_required(GroupCreateView.as_view()), name='group-add'),
    url(r'^groups/update/(?P<slug>[-_\w\d]+)/$', login_required(GroupUpdateView.as_view()), name='group-update'),
    url(r'^groups/delete/(?P<slug>[-_\w\d]+)/$', login_required(GroupDeleteView.as_view()), name='group-delete'),
    url(r'^groups/(?P<slug>[-_\w\d]+)/$', login_required(GroupDetailView.as_view()), name='group-detail'),
    url(r'^jx/groups/(?P<slug>[-_\w\d]+)/setpanoramic/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/$',
        login_required(GroupSetProjectPanoramicView.as_view()), name='group-set-project-panoramic'),
    url(r'^jx/groups/(?P<slug>[-_\w\d]+)/setpanoramic/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/$',
        login_required(GroupSetProjectPanoramicView.as_view()), name='group-set-project-panoramic'),

    # project urls
    url(r'^groups/(?P<group_slug>[-_\w\d]+)/projects/$', login_required(ProjectListView.as_view()),
        name='project-list'),

    url(r'^generalsuitedata/$', login_required(GeneralSuiteDataUpdateView.as_view()), name='generaldata-update'),
    url(r'^search/$', login_required(SearchAdminView.as_view()), name='search-admin'),


]

