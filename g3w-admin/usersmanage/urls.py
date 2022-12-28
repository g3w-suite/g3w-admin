from django.urls import path
from django.contrib.auth.decorators import login_required
from usersmanage.views import *


urlpatterns = [

    # user groups managment
    path('users/groups/', login_required(UserGroupListView.as_view()), name='user-group-list'),
    path('users/groups/add/', login_required(UserGroupCreateView.as_view()), name='user-group-add'),
    path('users/groups/<int:pk>/', login_required(UserGroupDetailView.as_view()), name='user-group-detail'),
    path('users/groups/update/<int:pk>/', login_required(UserGroupUpdateView.as_view()),
        name='user-group-update'),
    path('users/groups/delete/<int:pk>/', login_required(UserGroupAjaxDeleteView.as_view()),
        name='user-group-delete'),

    path('jx/user/groups/byuserrole/', login_required(UserGroupByUserRoleView.as_view()),
        name='user-group-by-user-role'),

    # user management
    path('users/', login_required(UserListView.as_view()), name='user-list-new'),
    path('users_old/', login_required(UserListViewOLD.as_view()), name='user-list'),
    path('users/add/', login_required(UserCreateView.as_view()), name='user-add'),
    path('users/<int:pk>/', login_required(UserDetailView.as_view()), name='user-detail'),
    path('users/update/<int:pk>/', login_required(UserUpdateView.as_view()), name='user-update'),
    path('users/delete/<int:pk>/', login_required(UserAjaxDeleteView.as_view()), name='user-delete'),




]