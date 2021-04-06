from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from base.urls import G3W_SITETREE_I18N_ALIAS
from .views import *

G3W_SITETREE_I18N_ALIAS.append('qdjango')

urlpatterns = [
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/$', login_required(QdjangoProjectListView.as_view()),
        name='qdjango-project-list'),
    url(r'^(?P<group_slug>[-_\w\d]+)/project/add/$', login_required(QdjangoProjectCreateView.as_view()),
        name='qdjango-project-add'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/update/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectUpdateView.as_view()), name='qdjango-project-update'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/delete/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDeleteView.as_view()), name='qdjango-project-delete'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDetailView.as_view()), name='qdjango-project-detail'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/download/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDownloadView.as_view(model=Project, file_field='qgis_file')),
        name='qdjango-project-download'),

    # for ajaxFiler
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/fast/update/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectFastUpdateView.as_view()), name='qdjango-project-fast-update'),

    # Layers urls
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/$',
        login_required(QdjangoLayersListView.as_view()), name='qdjango-project-layers-list'),
    url(r'^jx/(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<layer_id>[0-9]+)/cache/$',
        login_required(QdjangoLayerCacheView.as_view()), name='qdjango-project-layers-cache'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/$',
        login_required(QdjangoLayerWidgetsView.as_view()), name='qdjango-project-layer-widgets'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<slug>[-_\w\d]+)/layer/(?P<pk>[0-9]+)/detail/$',
        login_required(QdjangoLayerDetailView.as_view()), name='qdjango-layer-detail'),

    # for data layer by ajax
    url(r'^jx/(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<layer_id>[0-9]+)/data/$',
        login_required(QdjangoLayerDataView.as_view()), name='qdjango-project-layers-data-editing'),

    # Widget urls
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/add/$',
        login_required(QdjangoLayerWidgetCreateView.as_view()), name='qdjango-project-layer-widget-add'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/update/(?P<slug>[-_\w\d]+)$',
        login_required(QdjangoLayerWidgetUpdateView.as_view()), name='qdjango-project-layer-widget-update'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/delete/(?P<slug>[-_\w\d]+)$',
        login_required(QdjangoLayerWidgetDeleteView.as_view()), name='qdjango-project-layer-widget-delete'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/link/(?P<slug>[-_\w\d]+)$',
        login_required(QdjangoLinkWidget2LayerView.as_view()), name='qdjango-project-layer-widget-link'),

]

try:
    # encaspulate in a try except procedure for migration
    from sitetree.sitetreeapp import register_dynamic_trees, compose_dynamic_tree

    #get qdjango sitetree and add items to core sitetree:

    register_dynamic_trees(
        compose_dynamic_tree('qdjango', target_tree_alias='core', parent_tree_item_alias='project-list',
                             include_trees=('qdjango',)),
        reset_cache=True
    )
    register_dynamic_trees(
        compose_dynamic_tree('qdjango', target_tree_alias='core_en', parent_tree_item_alias='project-list',
                             include_trees=('qdjango_en',)),
        reset_cache=True
    )

except:
    pass
