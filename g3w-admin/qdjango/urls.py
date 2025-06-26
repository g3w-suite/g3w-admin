"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path, path
from django.contrib.auth.decorators import login_required
from sitetree.sitetreeapp import register_dynamic_trees, compose_dynamic_tree
from base.urls import G3W_SITETREE_I18N_ALIAS
from .views import *
from .sitetrees import sitetrees

G3W_SITETREE_I18N_ALIAS.append('qdjango')

urlpatterns = [

    #############################################################
    # Projects
    #############################################################
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/$',
        login_required(QdjangoProjectListView.as_view()),
        name='qdjango-project-list'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/project/add/$',
        login_required(QdjangoProjectCreateView.as_view()),
        name='qdjango-project-add'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/update/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectUpdateView.as_view()),
        name='qdjango-project-update'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/deactive/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDeActiveView.as_view()),
        name='qdjango-project-deactive'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/active/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectActiveView.as_view()),
        name='qdjango-project-active'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/delete/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDeleteView.as_view()),
        name='qdjango-project-delete'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDetailView.as_view()),
        name='qdjango-project-detail'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/download/(?P<slug>[-_\w\d]+)/$',
        login_required(QdjangoProjectDownloadView.as_view(model=Project, file_field='qgis_file')),
        name='qdjango-project-download'
    ),

    # For fast project update
    # TODO: try to reactivate
    #re_path(r'^(?P<group_slug>[-_\w\d]+)/projects/fast/update/(?P<slug>[-_\w\d]+)/$',
    #    login_required(QdjangoProjectFastUpdateView.as_view()), name='qdjango-project-fast-update'),


    #############################################################
    # Layers
    #############################################################

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/$',
        login_required(QdjangoLayersListView.as_view()),
        name='qdjango-project-layers-list'
    ),

    re_path(
        r'^jx/(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<layer_id>[0-9]+)/cache/$',
        login_required(QdjangoLayerCacheView.as_view()),
        name='qdjango-project-layers-cache'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/$',
        login_required(QdjangoLayerWidgetsView.as_view()),
        name='qdjango-project-layer-widgets'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<slug>[-_\w\d]+)/layer/(?P<pk>[0-9]+)/detail/$',
        login_required(QdjangoLayerDetailView.as_view()),
        name='qdjango-layer-detail'
    ),


    #############################################################
    # Data layer by ajax
    #############################################################

    re_path(
        r'^jx/(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layers/(?P<layer_id>[0-9]+)/data/$',
        login_required(QdjangoLayerDataView.as_view()),
        name='qdjango-project-layers-data-editing'
    ),


    #############################################################
    # Widgets
    #############################################################

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/add/$',
        login_required(QdjangoLayerWidgetCreateView.as_view()),
        name='qdjango-project-layer-widget-add'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/update/(?P<slug>[-_\w\d]+)$',
        login_required(QdjangoLayerWidgetUpdateView.as_view()),
        name='qdjango-project-layer-widget-update'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/delete/(?P<slug>[-_\w\d]+)$',
        login_required(QdjangoLayerWidgetDeleteView.as_view()),
        name='qdjango-project-layer-widget-delete'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/layer/(?P<layer_slug>[-_\w\d]+)/widgets/link/(?P<slug>[-_\w\d]+)$',
        login_required(QdjangoLinkWidget2LayerView.as_view()),
        name='qdjango-project-layer-widget-link'
    ),


    #############################################################
    # Filter by user/group
    #############################################################

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'filterbyuser/$',
        login_required(FilterByUserLayerView.as_view()),
        name='fitler-by-user-layer'
    ),

    #############################################################
    # Messages CRUD
    #############################################################

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/messages/$',
        login_required(QdjangoMessageListView.as_view()),
        name='qdjango-project-messages-list'
    ),
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/messages/add/$',
        login_required(QdjangoMessageCreateView.as_view()),
        name='qdjango-project-messages-add'
    ),
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/messages/update/(?P<pk>[0-9]+)/$',
        login_required(QdjangoMessageUpdateView.as_view()),
        name='qdjango-project-messages-update'
    ),
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/projects/(?P<project_slug>[-_\w\d]+)/messages/delete/(?P<pk>[0-9]+)/$',
        login_required(QdjangoMessageDeleteView.as_view()),
        name='qdjango-project-messages-delete'
    ),
]


try:
    # encaspulate in a try except procedure for migration
    # get qdjango sitetree and add items to core sitetree:

    register_dynamic_trees(
        compose_dynamic_tree(
            'qdjango',
            target_tree_alias='core',
            parent_tree_item_alias='project-list',
            include_trees=('qdjango',)
        ),
        reset_cache=True
    )

    tree_lang = [s.alias for s in sitetrees]

    # Other language
    for lang, lang_extended in settings.LANGUAGES:
        alias = f'qdjango_{lang}'
        alias = alias if alias in tree_lang else 'qdjango'
        register_dynamic_trees(
            compose_dynamic_tree(
                'qdjango',
                target_tree_alias=f'core_{lang}',
                parent_tree_item_alias='project-list',
                include_trees=(alias,)
            ),
            reset_cache=True
        )
except:
    pass
