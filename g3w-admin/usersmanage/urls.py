from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from usersmanage.views import *


urlpatterns = [
    url(r'^users/$', login_required(UserListView.as_view()), name='user-list'),
    url(r'^users/add/$', login_required(UserCreateView.as_view()), name='user-add'),
    url(r'^users/(?P<pk>[-_\w\d]+)/$',login_required(UserDetailView.as_view()),name='user-detail'),
    url(r'^users/update/(?P<pk>[-_\w\d]+)/$',login_required(UserUpdateView.as_view()),name='user-update'),
    url(r'^users/delete/(?P<pk>[-_\w\d]+)/$',login_required(UserAjaxDeleteView.as_view()), name='user-delete'),
]