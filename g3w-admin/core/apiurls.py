from django.urls import path, re_path
from django.contrib.auth.decorators import login_required
from .api.views import layer_vector_view, G3WSUITEInfoAPIView, QgsExpressionLayerContextEvalView
from .views import GroupSetOrderView, MacroGroupSetOrderView, InterfaceProxy


urlpatterns = [
    re_path(r'^vector/api/(?P<mode_call>data|config|shp|xls|gpkg|gpx|csv|filtertoken)/(?P<project_type>[-_\w\d]+)/'
            r'(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view, name='core-vector-api'),

    # with extention
    re_path(r'^vector/api/(?P<mode_call>shp|xls|gpx|csv|gpkg)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+).(?P<ext>zip|xls|gpx|csv|gpkg)$',
        layer_vector_view, name='core-vector-api-ext'),

    re_path(r'^vector/api/(?P<mode_call>widget)/(?P<widget_type>[-_\w\d]+)/data/'
        r'(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view, name='core-vector-api-widget'),

    # changing order
    re_path(r'^jx/groups/(?P<group_id>[0-9]+)/setorder/$',
        login_required(GroupSetOrderView.as_view()), name='group-set-order'),

    re_path(r'^jx/macrogroups/(?P<group_id>[0-9]+)/setorder/$',
        login_required(MacroGroupSetOrderView.as_view()), name='macrogroup-set-order'),

    re_path(r'^api/deploy/info/$', G3WSUITEInfoAPIView.as_view(), name='deploy-info-api'),

    # POST only method to return QGIS Expressions evaluated in Project an optional Layer/Form context
    # (passing form_data and qgs_layer_id in the post body)
    re_path(r'^api/expression_eval/(?P<project_id>[0-9]+)/$',
        login_required(QgsExpressionLayerContextEvalView.as_view()), name='layer-expression-eval'),

    # General proxy view for Client external calls, i.e. for COORS.
    # =============================================================
    path('interface/proxy/', InterfaceProxy.as_view(), name="interface-proxy")

]
