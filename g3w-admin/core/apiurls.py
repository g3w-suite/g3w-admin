from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.views import layer_vector_view, G3WSUITEInfoAPIView
from .views import GroupSetOrderView, MacroGroupSetOrderView


urlpatterns = [
    url(r'^vector/api/(?P<mode_call>data|config|shp|xls|gpkg|gpx|csv|filtertoken)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view, name='core-vector-api'),

    # with extention
    url(r'^vector/api/(?P<mode_call>shp|xls|gpx|csv|gpkg)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+).(?P<ext>zip|xls|gpx|csv|gpkg)$',
        layer_vector_view, name='core-vector-api-ext'),

    url(r'^vector/api/(?P<mode_call>widget)/(?P<widget_type>[-_\w\d]+)/data/'
        r'(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        layer_vector_view, name='core-vector-api-widget'),

    # changing order
    url(r'^jx/groups/(?P<group_id>[0-9]+)/setorder/$',
        login_required(GroupSetOrderView.as_view()), name='group-set-order'),

    url(r'^jx/macrogroups/(?P<group_id>[0-9]+)/setorder/$',
        login_required(MacroGroupSetOrderView.as_view()), name='macrogroup-set-order'),

    url(r'^api/deploy/info/$', G3WSUITEInfoAPIView.as_view(), name='deploy-info-api')
]