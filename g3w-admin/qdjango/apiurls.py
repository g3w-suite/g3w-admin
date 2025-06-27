"""
Add your API routes here.
"""
# API ROOT: /qdjango/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path, re_path
from django.contrib.auth.decorators import login_required

from .api.layers.views import (
    LayerUserInfoAPIView,
    LayerAuthGroupInfoAPIView,
    LayerStyleListView,
    LayerStyleDetailView,
    LayerPolygonView,
    LayerInfoView
)
from .api.constraints.views import (
    ConstraintExpressionRuleDetail,
    ConstraintExpressionRuleList,
    ConstraintSubsetStringRuleDetail,
    ConstraintSubsetStringRuleList,
    SingleLayerConstraintDetail,
    SingleLayerConstraintList,
)
from .api.geoconstraints.views import (
    GeoConstraintList,
    GeoConstraintDetail,
    GeoConstraintRuleList,
    GeoConstraintRuleDetail,
    GeoConstraintGEOFeatureAPIView
)
from .api.projects.views import (
    QdjangoWebServicesAPIview,
    QdjangoAsGeoTiffAPIview,
    QdjangoPrjThemeAPIview,
    QdjangoAlternativeUniqueLayerAPIView
)
from .api.column_acl.views import (
    ColumnAclList,
    ColumnAclDetail,
    ColumnAclFields,
)
from .api.layerscaleconstraints.views import (
    ScaleVisibilityLayerConstraintList,
    ScaleVisibilityLayerConstraintDetail
)

from .views import ProjectSetOrderView


urlpatterns = [

    #############################################################
    # Subset string rules (Single layer)
    #############################################################

    # Detail of a subsetstringrule
    path(
        'api/subsetstringrule/detail/<int:pk>/',
        login_required(ConstraintSubsetStringRuleDetail.as_view()),
        name='qdjango-subsetstringrule-api-detail'
    ),

    # All subsetstringrule(s) filtered by layer qdjango layer pk
    path(
        'api/subsetstringrule/layer/<int:layer_id>/',
        login_required(ConstraintSubsetStringRuleList.as_view()),
        name='qdjango-subsetstringrule-api-filter-by-layer-id'
    ),

    # All subsetstringrule(s) filtered by User pk
    path(
        'api/subsetstringrule/user/<int:user_id>/',
        login_required(ConstraintSubsetStringRuleList.as_view()),
        name='qdjango-subsetstringrule-api-filter-by-user'
    ),

    # All subsetstringrule(s) filtered by Constraint pk
    path(
        'api/subsetstringrule/constraint/<int:constraint_id>/',
        login_required(ConstraintSubsetStringRuleList.as_view()),
        name='qdjango-subsetstringrule-api-filter-by-constraint'
    ),

    # All subsetstringrule(s)
    path(
        'api/subsetstringrule/',
        login_required(ConstraintSubsetStringRuleList.as_view()),
        name='qdjango-subsetstringrule-api-list'
    ),


    #############################################################
    # Expression rules (Single layer)
    #############################################################

    # Detail of a expression rule
    path(
        'api/expressionrule/detail/<int:pk>/',
        login_required(ConstraintExpressionRuleDetail.as_view()),
        name='qdjango-expressionrule-api-detail'
    ),

    # All expressionrule(s) filtered by layer qdjango layer pk
    path(
        'api/expressionrule/layer/<int:layer_id>/',
        login_required(ConstraintExpressionRuleList.as_view()),
        name='qdjango-expressionrule-api-filter-by-layer-id'
    ),

    # All expressionrule(s) filtered by User pk
    path(
        'api/expressionrule/user/<int:user_id>/',
        login_required(ConstraintExpressionRuleList.as_view()),
        name='qdjango-expressionrule-api-filter-by-user'
    ),

    # All expressionrule(s) filtered by Constraint pk
    path(
        'api/expressionrule/constraint/<int:constraint_id>/',
        login_required(ConstraintExpressionRuleList.as_view()),
        name='qdjango-expressionrule-api-filter-by-constraint'
    ),

    # All expressionrule(s)
    path(
        'api/expressionrule/',
        login_required(ConstraintExpressionRuleList.as_view()),
        name='qdjango-expressionrule-api-list'
    ),


    #############################################################
    # Constraints (Single layer)
    #############################################################

    # Detail of a Constraint
    path(
        'api/constraint/detail/<int:pk>/',
        login_required(SingleLayerConstraintDetail.as_view()),
        name='qdjango-constraint-api-detail'
    ),

    # All Constraint(s) filtered by layer qdjango layer pk
    path(
        'api/constraint/layer/<int:layer_id>/',
        login_required(SingleLayerConstraintList.as_view()),
        name='qdjango-constraint-api-filter-by-layer-id'
    ),

    # All Constraint(s) filtered by user
    path(
        'api/constraint/user/<int:user_id>/',
        login_required(SingleLayerConstraintList.as_view()),
        name='qdjango-constraint-api-filter-by-user'
    ),

    # All Constraint(s)
    path(
        'api/constraint/',
        login_required(SingleLayerConstraintList.as_view()),
        name='qdjango-constraint-api-list'
    ),


    #############################################################
    # ColumnAcl (Single layer)
    #############################################################

    # Detail of a ColumnAcl
    path(
        'api/column_acl/detail/<int:pk>/',
        login_required(ColumnAclDetail.as_view()),
        name='qdjango-column-acl-api-detail'
    ),

    # All (s) ColumnAcl filtered by layer qdjango layer pk
    path(
        'api/column_acl/layer/<int:layer_id>/',
        login_required(ColumnAclList.as_view()),
        name='qdjango-column-acl-api-filter-by-layer-id'
    ),

    # All Constraint(s) filtered by user
    path(
        'api/column_acl/user/<int:user_id>/',
        login_required(ColumnAclList.as_view()),
        name='qdjango-column-acl-api-filter-by-user'
    ),

    # All Constraint(s) filtered by group
    path(
        'api/column_acl/group/<int:group_id>/',
        login_required(ColumnAclList.as_view()),
        name='qdjango-column-acl-api-filter-by-group'
    ),

    # List field names for a vector layer
    path(
        'api/column_acl/fields/<int:layer_id>/',
        login_required(ColumnAclFields.as_view()),
        name='qdjango-column-acl-api-fields'
    ),

    # All Constraint(s)
    path(
        'api/column_acl/',
        login_required(ColumnAclList.as_view()),
        name='qdjango-column-acl-api-list'
    ),

    #############################################################
    # ScaleVisibilityLayerConstraint (Single layer)
    #############################################################

    # Detail of a ScaleVisibilityLayerConstraint
    path(
        'api/scalevisconstraint/detail/<int:pk>/',
        login_required(ScaleVisibilityLayerConstraintDetail.as_view()),
        name='qdjango-scalevisconstraint-api-detail'
    ),

    # All (s) ColumnAcl filtered by layer qdjango layer pk
    path(
        'api/scalevisconstraint/layer/<int:layer_id>/',
        login_required(ScaleVisibilityLayerConstraintList.as_view()),
        name='qdjango-scalevisconstraint-api-filter-by-layer-id'
    ),

    # All Constraint(s) filtered by user
    path(
        'api/scalevisconstraint/user/<int:user_id>/',
        login_required(ScaleVisibilityLayerConstraintList.as_view()),
        name='qdjango-scalevisconstraint-api-filter-by-user'
    ),

    # All Constraint(s) filtered by group
    path(
        'api/scalevisconstraint/group/<int:group_id>/',
        login_required(ScaleVisibilityLayerConstraintList.as_view()),
        name='qdjango-scalevisconstraint-api-filter-by-group'
    ),

    # All Constraint(s)
    path(
        'api/scalevisconstraint/',
        login_required(ScaleVisibilityLayerConstraintList.as_view()),
        name='qdjango-scalevisconstraint-api-list'
    ),

    #############################################################
    # GeoConstraints (Single layer)
    #############################################################

    # Detail of a GeoConstraintRule
    path(
        'api/georule/detail/<int:pk>/',
        login_required(GeoConstraintRuleDetail.as_view()),
        name='geoconstraintrule-api-detail'
    ),

    # All ConstraintRule(s) filtered by editing layer id
    re_path(
        r'^api/georule/layer/(?P<layer_id>[-_\w\d]+)/$',
        login_required(GeoConstraintRuleList.as_view()),
        name='geoconstraintrule-api-filter-by-layer'
    ),

    # All ConstraintRule(s) filtered by User pk
    path(
        'api/georule/user/<int:user_id>/',
        login_required(GeoConstraintRuleList.as_view()),
        name='geoconstraintrule-api-filter-by-user'
    ),

    # All ConstraintRule(s) filtered by Constraint pk
    path(
        'api/georule/geoconstraint/<int:constraint_id>/',
        login_required(GeoConstraintRuleList.as_view()),
        name='geoconstraintrule-api-filter-by-constraint'
    ),

    # All ConstraintRule(s)
    path(
        'api/georule/',
        login_required(GeoConstraintRuleList.as_view()),
        name='geoconstraintrule-api-list'
    ),

    # Constraint geometry
    re_path(
        r'^api/geoconstraint/geometry/(?P<layer_id>[-_\w\d]+)/$',
        login_required(GeoConstraintGEOFeatureAPIView.as_view()),
        name='geoconstraint-api-geometry'
    ),

    # Detail of a Constraint
    path(
        'api/geoconstraint/detail/<int:pk>/',
        login_required(GeoConstraintDetail.as_view()),
        name='geoconstraint-api-detail'
    ),

    # All Constraint(s) filtered by editing layer id
    re_path(
        r'^api/geoconstraint/(?P<layer_id>[-_\w\d]+)/$',
        login_required(GeoConstraintList.as_view()),
        name='geoconstraint-api-filter-by-layer'
    ),

    # All Constraint(s)
    path(
        'api/geoconstraint/',
        login_required(GeoConstraintList.as_view()),
        name='geoconstraint-api-list'
    ),


    #############################################################
    # OGC (web) services
    #############################################################

    # All Service(s)
    path(
        'api/webservice/<int:project_id>/',
        login_required(QdjangoWebServicesAPIview.as_view()),
        name='qdjango-webservice-api-list'
    ),


    #############################################################
    # General API
    #############################################################

    path(
        'api/asgeotiff/<int:project_id>/',
        QdjangoAsGeoTiffAPIview.as_view(),
        name='qdjango-asgeotiff-api'
    ),
    re_path(
        r'^api/prjtheme/(?P<project_id>\d+)/(?P<theme_name>[-_\w\d\s:.=,]+)/$',
        QdjangoPrjThemeAPIview.as_view(),
        name='qdjango-prjtheme-api'
    ),


    #############################################################
    # Order
    #############################################################

    path(
        'jx/project/<int:project_id>/setorder/',
        login_required(ProjectSetOrderView.as_view()),
        name='qdjango-project-set-order'
    ),


    #############################################################
    # Layer style manager
    #############################################################

    path(
        'api/layerstyles/<int:layer_id>/',
        login_required(LayerStyleListView.as_view()),
        name='qdjango-style-list-api'
    ),

    re_path(
        r'^api/layerstyles/(?P<layer_id>\d+)/(?P<style_name>[\w\s%-]+)/$',
        login_required(LayerStyleDetailView.as_view()),
        name='qdjango-style-detail-api'
    ),

    #############################################################
    # API Info
    #############################################################

    # Other vector layers in project get by qdjango layer id
    re_path(
        r'^api/info/layer/polygon/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerPolygonView.as_view()),
        name='qdjango-api-info-layer-polygon'
    ),

    # Viewers users can editing on editing layer id
    re_path(
        r'^api/info/layer/user/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerUserInfoAPIView.as_view()),
        name='qdjango-api-info-layer-user'
    ),

    # Viewers users groups viewer can editing on editing layer id
    re_path(
        r'^api/info/layer/authgroup/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerAuthGroupInfoAPIView.as_view()),
        name='qdjango-api-info-layer-authgroup'
    ),

    path('api/info/layer/<int:pk>/',
         login_required(LayerInfoView.as_view()),
         name='qdjango-api-info-layer'
     ),


    #############################################################
    # API for search widgets
    #############################################################

    # Only post
    path(
        'api/alternativeuniquelayer/<int:project_id>/<str:layer_id>/',
        login_required(QdjangoAlternativeUniqueLayerAPIView.as_view()),
        name='qdjango-api-alternative-unique-layer'
    ),
]