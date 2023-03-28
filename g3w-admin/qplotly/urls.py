"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path
from django.contrib.auth.decorators import login_required

from .views import (
    QplotlyLinkWidget2LayerView,
    QplotlyDownloadView,
    QplotlyWidgetShowOnStartClientView,
)


urlpatterns = [

    path(
        'layer/<int:layer_pk>/widgets/link/<int:pk>/',
        login_required(QplotlyLinkWidget2LayerView.as_view()),
        name='qplotly-project-layer-widget-link'
    ),

    path(
        'showonstartclient/<int:pk>/',
        login_required(QplotlyWidgetShowOnStartClientView.as_view()),
        name='qplotly-project-layer-widget-showonstartclient'
    ),

    path(
        'download/xml/<int:pk>/',
        login_required(QplotlyDownloadView.as_view()),
        name='qplotly-download-xml'
    )

]