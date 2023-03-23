"""
Add your API routes here.
"""
# API ROOT: /filemanager/

from django.urls import path
from django.contrib.auth.decorators import login_required

from .views import files_view


urlpatterns = [

    path(
        'api/files/',
        login_required(files_view),
        name='filemanager-logic'
    ),

]