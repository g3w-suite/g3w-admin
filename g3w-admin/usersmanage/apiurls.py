"""
Add your API routes here.
"""
# API ROOT: /usersmanage/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path
from .api.views import UserViewAPIListView

urlpatterns = [
    path('api/users/', UserViewAPIListView.as_view(), name='usermanage-api-users')
]