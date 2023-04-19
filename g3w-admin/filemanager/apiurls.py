"""
Add your API routes here.
"""
# API ROOT: /filemanager/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

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