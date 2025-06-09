"""
Add your API routes here.
"""
# API ROOT: /core/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.conf import settings
from django.urls import path, re_path
from django.contrib.auth.decorators import login_required

from .views import(
    InterfaceProxy,
    GroupSetOrderView,
    MacroGroupSetOrderView,
) 
from .api.views import (
    layer_vector_view,
    G3WSUITEInfoAPIView,
    QgsExpressionLayerContextEvalView,
    layer_raster_view,
    InterfaceOws,
    CRSInfoAPIView,
    HTML2PDFAPIView,
    ShortURLView, PermaLinkView
)


urlpatterns = [

    #############################################################
    # Vector data API management
    #############################################################
    re_path(
        r'^' + settings.VECTOR_URL[1:] + r'(?P<mode_call>data|config|shp|xls|gpkg|gpx|csv|filtertoken|featurecount|editorformstructure)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view,
        name='core-vector-api'
    ),

    re_path(
        r'^' + settings.VECTOR_URL[1:] + r'(?P<mode_call>shp|xls|gpx|csv|gpkg)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+).(?P<ext>zip|xls|gpx|csv|gpkg)$',
        layer_vector_view,
        name='core-vector-api-ext'
    ),

    re_path(
        r'^' + settings.VECTOR_URL[1:] + r'(?P<mode_call>widget)/(?P<widget_type>[-_\w\d]+)/data/'
        r'(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view,
        name='core-vector-api-widget'
    ),

    #############################################################
    # G3W-ADMIN api for change ordering of group and macrogorup
    #############################################################
    path(
        'jx/groups/<int:group_id>/setorder/',
        login_required(GroupSetOrderView.as_view()),
        name='group-set-order'
    ),

    path(
        'jx/macrogroups/<int:group_id>/setorder/',
        login_required(MacroGroupSetOrderView.as_view()),
        name='macrogroup-set-order'
    ),

    #############################################################
    # G3W-ADMIN DEPLOY INFO
    #############################################################
    path(
        'api/deploy/info/',
        G3WSUITEInfoAPIView.as_view(),
        name='deploy-info-api'
    ),

    #############################################################
    # QGIS EXPRESSION EVALUATION API
    #
    # POST only method to return QGIS Expressions evaluated in
    # Project an optional Layer/Form context (passing form_data
    # and qgs_layer_id in the post body)
    #############################################################
    path(
        'api/expression_eval/<int:project_id>/',
        QgsExpressionLayerContextEvalView.as_view(),
        name='layer-expression-eval'
    ),

    #############################################################
    # General proxy view for Client external calls, i.e. for CORS
    #############################################################
    path(
        'interface/proxy/',
        InterfaceProxy.as_view(),
        name="interface-proxy"
    ),

    #############################################################
    # Interface API to get information, layer, styles to OWS
    # services
    #############################################################
    path(
        'interface/ows/',
        InterfaceOws.as_view(),
        name="interface-ows"
    ),

    #############################################################
    # For raster data: export as geotiff
    #############################################################
    re_path(
        r'^' + settings.RASTER_URL[1:] + r'(?P<mode_call>geotiff)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_raster_view,
        name='core-raster-api'
    ),

    #############################################################
    # CRS API info
    #############################################################
    path(
        'crs/<int:epsg>/',
        CRSInfoAPIView.as_view(),
        name='core-crs-api'
    ),

    #############################################################
    # html2pdf API info
    #############################################################
    path(
        'html2pdf/',
        HTML2PDFAPIView.as_view(),
        name='core-html2pdf-api'
    ),

    #############################################################
    # shorturl/permalink API info
    #############################################################
    path(
        'api/su/',
        ShortURLView.as_view(),
        name='core-shorturl-api'
    ),
    path(
        'api/embed/', 
        PermaLinkView.as_view(), 
        name='core-permalink-create'
    ),
    path(
        'api/embed/<str:code>/',
        PermaLinkView.redirect_url,
        name='core-permalink-redirect'
    ),

    #############################################################
    # ShortUrl
    #############################################################

    path(
        'su/<str:code>/',
        ShortURLView.redirect_url,
        name='shorturl_redirect_url'
    ),

]
