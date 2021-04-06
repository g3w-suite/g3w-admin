
# coding=utf-8
""""URLs for Openrouteservice admin views (see apiurls for APIs)

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-30'
__copyright__ = 'Copyright 2021, Gis3W'



from django.urls import path
from .views import *
from django.contrib.auth.decorators import login_required


urlpatterns = [
    path('openrouteservice/projects/',
         login_required(OpenrouteserviceProjectList.as_view()), name='ors-project-list'),
    path(
        'openrouteservice/project/add/', login_required(
            OpenrouteserviceProjectCreate.as_view()), name='ors-project-add'),
    path(
        'openrouteservice/project/<int:pk>/', login_required(
            OpenrouteserviceProjectUpdate.as_view()), name='ors-project-update'),
    path(
        'openrouteservice/project/delete/<int:pk>/', login_required(
            OpenrouteserviceProjectDelete.as_view()), name='ors-project-delete'),
]
