from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from usersmanage.views import *


urlpatterns = [

    # user groups managment
    url(r'^users/groups/$', login_required(UserGroupListView.as_view()), name='user-group-list'),
    url(r'^users/groups/add/$', login_required(UserGroupCreateView.as_view()), name='user-group-add'),
    url(r'^users/groups/(?P<pk>[-_\w\d]+)/$',login_required(UserGroupDetailView.as_view()), name='user-group-detail'),
    url(r'^users/groups/update/(?P<pk>[-_\w\d]+)/$',login_required(UserGroupUpdateView.as_view()),
        name='user-group-update'),
    url(r'^users/groups/delete/(?P<pk>[-_\w\d]+)/$',login_required(UserGroupAjaxDeleteView.as_view()),
        name='user-group-delete'),

    # user management
    url(r'^users/$', login_required(UserListView.as_view()), name='user-list'),
    url(r'^users/add/$', login_required(UserCreateView.as_view()), name='user-add'),
    url(r'^users/(?P<pk>[-_\w\d]+)/$',login_required(UserDetailView.as_view()), name='user-detail'),
    url(r'^users/update/(?P<pk>[-_\w\d]+)/$',login_required(UserUpdateView.as_view()), name='user-update'),
    url(r'^users/delete/(?P<pk>[-_\w\d]+)/$',login_required(UserAjaxDeleteView.as_view()), name='user-delete'),


]