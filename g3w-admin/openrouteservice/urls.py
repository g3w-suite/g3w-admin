"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'elpaso@itopen.it'
__date__      = '2021-03-30'
__copyright__ = 'Copyright 2021, ItOpen'
__license__   = "MPL 2.0"

from django.urls import path
from django.contrib.auth.decorators import login_required
from base.urls import G3W_SITETREE_I18N_ALIAS

from .views import *

G3W_SITETREE_I18N_ALIAS.append('openrouteservice')

urlpatterns = [

    path(
        'openrouteservice/projects/',
         login_required(OpenrouteserviceProjectList.as_view()),
         name='ors-project-list'
    ),

    path(
        'openrouteservice/project/add/',
        login_required(OpenrouteserviceProjectCreate.as_view()),
        name='ors-project-add'
    ),

    path(
        'openrouteservice/project/<int:pk>/',
        login_required(OpenrouteserviceProjectUpdate.as_view()),
        name='ors-project-update'
    ),

    path(
        'openrouteservice/project/delete/<int:pk>/',
        login_required(OpenrouteserviceProjectDelete.as_view()),
        name='ors-project-delete'
    ),

]
