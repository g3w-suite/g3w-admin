from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from base.urls import G3W_SITETREE_I18N_ALIAS
from .views import *



G3W_SITETREE_I18N_ALIAS.append('qdjango')

urlpatterns = [
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/$', login_required(QdjangoProjectListView.as_view()), name='qdjango-project-list'),
    url(r'^(?P<group_slug>[-_\w\d]+)/project/add/$', login_required(OdjangoProjectCreateView.as_view()), name='qdjango-project-add'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/update/(?P<slug>[-_\w\d]+)/$', login_required(QdjangoProjectUpdateView.as_view()), name='qdjango-project-update'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/delete/(?P<slug>[-_\w\d]+)/$', login_required(QdjangoProjectDeleteView.as_view()), name='qdjango-project-delete'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<slug>[-_\w\d]+)/$', login_required(QdjangoProjectDetailView.as_view()), name='qdjango-project-detail'),

    # Layers urls
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/$', login_required(QdjangoLayersListView.as_view()), name='qdjango-project-layers-list'),
    url(r'^jx/(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<layer_id>[0-9]+)/cache/$', login_required(QdjangoLayerCacheView.as_view()), name='qdjango-project-layers-cache'),
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<slug>[-_\w\d]+)/widgets/$',
        login_required(QdjangoLayerWidgetsView.as_view()), name='qdjango-project-layer-widgets'),

    # Widget urls
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<slug>[-_\w\d]+)/widgets/add/$',
        login_required(QdjangoLayerWidgetCreateView.as_view()), name='qdjango-project-layer-widget-add'),

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
