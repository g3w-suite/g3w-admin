from django.urls import path, re_path
from django.contrib.auth.decorators import login_required
from base.urls import G3W_SITETREE_I18N_ALIAS
from .views import *


G3W_SITETREE_I18N_ALIAS.append('filemanager_sidebar_right')

urlpatterns = [
    path(
        '',
        login_required(FilemanagerView.as_view()),
        name='filemanager-home'
    ),

    re_path(
        r'^config/(?P<file_js>[-_\.\\\w\d]+)$',
        login_required(FilemanagerServeConfigView.as_view()),
       name='filemanager-serve-file-config'
    ),
]
