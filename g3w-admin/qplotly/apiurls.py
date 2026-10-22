"""
Add your API routes here.
"""
# API ROOT: /qplotly/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path, path
from django.contrib.auth.decorators import login_required

from .views import QploltyWidgetSetOrderView
from .api.plots.views import (
    QplotlyTraceAPIView, 
    QplotlyTraceConfigAPIView
)
from .api.widgets.views import (
    QplotlyWidgetList,
    QplotlyWidgetDetail,
    QplotlyWidgetRelatedWidgetView,
    QplotlyWidgetRelatedWidgetPostView,
    QplotlyWidgetAvailableRelatedView,
    QplotlyWidgetFreeView,
)


BASE_URLS = 'qplotly'

urlpatterns = [

    #############################################################
    # Traces
    #############################################################

    re_path(
        r'^api/trace/(?P<project_id>[0-9]+)/(?P<pk>\d+)/$',
        QplotlyTraceAPIView.as_view(),
        name='qplotly-api-trace'
    ),

    re_path(
        r'^api/trace/(?P<project_id>[0-9]+)/(?P<qgs_layer_id>[-_\w\d]+)/(?P<pk>\d+)/$',
        QplotlyTraceAPIView.as_view(),
        name='qplotly-api-trace-qgs-layer-id'
    ),

    #############################################################
    # Widgets
    #############################################################

    # Detail/Update
    re_path(
        r'^api/widget/detail/(?P<project_id>\d+)/(?P<pk>\d+)/$',
        login_required(QplotlyWidgetDetail.as_view()),
        name='qplotly-widget-api-detail'
    ),

    # Widget(s) filter by layer_id
    re_path(
        r'^api/widget/layer/(?P<layer_id>\d+)/$',
        login_required(QplotlyWidgetList.as_view()),
        name='qplotly-widget-api-filter-by-layer-id'
    ),

    # All Widget(s)
    re_path(
        r'^api/widget/$',
        login_required(QplotlyWidgetList.as_view()),
        name='qplotly-widget-api-list'
    ),

    #############################################################
    # Related widgets
    #############################################################

    # Add relation (POST only)
    path(
        'api/widget/related/<int:pk>/',
        login_required(QplotlyWidgetRelatedWidgetPostView.as_view()),
        name='qplotly-widget-related-api'
    ),

    # List related widgets by project
    path(
        'api/widget/related/<int:pk>/<int:project_id>/',
        login_required(QplotlyWidgetRelatedWidgetView.as_view()),
        name='qplotly-widget-related-api-project'
    ),

    # Remove relation
    path(
        'api/widget/related/<int:pk>/<int:target_pk>/<int:project_id>/',
        login_required(QplotlyWidgetRelatedWidgetView.as_view()),
        name='qplotly-widget-related-api-delete'
    ),

    # Available widgets to be added as related
    path(
        'api/widget/related/<int:pk>/available/<int:project_id>/',
        login_required(QplotlyWidgetAvailableRelatedView.as_view()),
        name='qplotly-widget-related-available-api'
    ),

    # Free widgets on a layer (not involved in any relation)
    path(
        'api/widget/free/<int:project_id>/<int:layer_id>/',
        login_required(QplotlyWidgetFreeView.as_view()),
        name='qplotly-widget-free-api'
    ),

    #############################################################
    # Order
    #############################################################

    path(
        'jx/widgets/setorder/',
        login_required(QploltyWidgetSetOrderView.as_view()),
        name='qplotly-widget-set-order'
    ),


    #############################################################
    # Trace config API
    #############################################################
    path(
        'api/trace-config/<int:pk>/',
        QplotlyTraceConfigAPIView.as_view(),
        name='qplotly-trace-plot-config-api'
    ),

]