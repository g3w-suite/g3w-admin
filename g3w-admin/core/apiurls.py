from django.conf import settings
from django.urls import path, re_path
from django.contrib.auth.decorators import login_required
from .views import InterfaceProxy
from .api.views import \
    layer_vector_view, \
    G3WSUITEInfoAPIView, \
    QgsExpressionLayerContextEvalView, \
    layer_raster_view, \
    InterfaceOws, \
    CRSInfoAPIView
from .views import \
    GroupSetOrderView, \
    MacroGroupSetOrderView


urlpatterns = [
    re_path(
        r'^' + settings.VECTOR_URL[1:] + r'(?P<mode_call>data|config|shp|xls|gpkg|gpx|csv|filtertoken)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view,
        name='core-vector-api'
    ),

    # with extention
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

    # Changing order
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

    path(
        'api/deploy/info/',
        G3WSUITEInfoAPIView.as_view(),
        name='deploy-info-api'
    ),

    # POST only method to return QGIS Expressions evaluated in Project an optional Layer/Form context
    # (passing form_data and qgs_layer_id in the post body)
    path(
        'api/expression_eval/<int:project_id>/',
        login_required(QgsExpressionLayerContextEvalView.as_view()),
        name='layer-expression-eval'
    ),

    # General proxy view for Client external calls, i.e. for COORS.
    # =============================================================
    path(
        'interface/proxy/',
        InterfaceProxy.as_view(),
        name="interface-proxy"
    ),

    # Interface API to get informations, layer, styles to a ows services
    # ==================================================================
    path(
        'interface/ows/',
        InterfaceOws.as_view(),
        name="interface-ows"
    ),

    # For raster data
    # ---------------
    re_path(
        r'^' + settings.RASTER_URL[1:] + r'(?P<mode_call>geotiff)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_raster_view,
        name='core-raster-api'
    ),

    # CRS API info
    # ------------
    path('crs/<int:epsg>/', CRSInfoAPIView.as_view(), name='core-crs-api')

]
