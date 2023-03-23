"""
Add your API routes here.
"""
# API ROOT: /qplotly/

__author__    = 'lorenzetti@gis3w.it'
__date__      = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path
from django.contrib.auth.decorators import login_required

from .api.plots.views import QplotlyTraceAPIView
from .api.widgets.views import (
    QplotlyWidgetList,
    QplotlyWidgetDetail,
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

]