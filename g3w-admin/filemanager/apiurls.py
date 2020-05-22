from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import files_view

urlpatterns = [
    url(r'^api/files/$', login_required(files_view), name='filemanager-logic'),
]