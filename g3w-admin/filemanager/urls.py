from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from base.urls import G3W_SITETREE_I18N_ALIAS
from .views import *


G3W_SITETREE_I18N_ALIAS.append('filemanager_sidebar_right')

urlpatterns = [
    url(r'^$', login_required(FilemanagerView.as_view()), name='filemanager-home'),
    url(r'^config/(?P<file_js>[-_\.\\\w\d]+)$', login_required(FilemanagerServeConfigView.as_view()),
       name='filemanager-serve-file-config'),
]
