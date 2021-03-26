# coding=utf-8
""""qdjango API URLs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""


from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.layers.views import (
    LayerUserInfoAPIView,
    LayerAuthGroupInfoAPIView,
    LayerStyleListView,
    LayerStyleDetailView,
    LayerPolygonView
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
)
from rest_framework.urlpatterns import format_suffix_patterns

# Single layer Constraints
urlpatterns = [

    #############################################################
    # Subset string rules

    # Detail of a subsetstringrule
    url(r'^api/subsetstringrule/detail/(?P<pk>\d+)/$',
        login_required(ConstraintSubsetStringRuleDetail.as_view()), name='qdjango-subsetstringrule-api-detail'),
    # All subsetstringrule(s) filtered by layer qdjango layer pk
    url(r'^api/subsetstringrule/layer/(?P<layer_id>[\d]+)/$',
        login_required(ConstraintSubsetStringRuleList.as_view()), name='qdjango-subsetstringrule-api-filter-by-layer-id'),
    # All subsetstringrule(s) filtered by User pk
    url(r'^api/subsetstringrule/user/(?P<user_id>\d+)/$',
        login_required(ConstraintSubsetStringRuleList.as_view()), name='qdjango-subsetstringrule-api-filter-by-user'),
    # All subsetstringrule(s) filtered by Constraint pk
    url(r'^api/subsetstringrule/constraint/(?P<constraint_id>\d+)/$',
        login_required(ConstraintSubsetStringRuleList.as_view()), name='qdjango-subsetstringrule-api-filter-by-constraint'),
    # All subsetstringrule(s)
    url(r'^api/subsetstringrule/$',
        login_required(ConstraintSubsetStringRuleList.as_view()), name='qdjango-subsetstringrule-api-list'),

    #############################################################
    # Expression rules

    # Detail of a expression rule
    url(r'^api/expressionrule/detail/(?P<pk>\d+)/$',
        login_required(ConstraintExpressionRuleDetail.as_view()), name='qdjango-expressionrule-api-detail'),
    # All expressionrule(s) filtered by layer qdjango layer pk
    url(r'^api/expressionrule/layer/(?P<layer_id>[\d]+)/$',
        login_required(ConstraintExpressionRuleList.as_view()), name='qdjango-expressionrule-api-filter-by-layer-id'),
    # All expressionrule(s) filtered by User pk
    url(r'^api/expressionrule/user/(?P<user_id>\d+)/$',
        login_required(ConstraintExpressionRuleList.as_view()), name='qdjango-expressionrule-api-filter-by-user'),
    # All expressionrule(s) filtered by Constraint pk
    url(r'^api/expressionrule/constraint/(?P<constraint_id>\d+)/$',
        login_required(ConstraintExpressionRuleList.as_view()), name='qdjango-expressionrule-api-filter-by-constraint'),
    # All expressionrule(s)
    url(r'^api/expressionrule/$',
        login_required(ConstraintExpressionRuleList.as_view()), name='qdjango-expressionrule-api-list'),


    #############################################################
    # Constraints

    # Detail of a Constraint
    url(r'^api/constraint/detail/(?P<pk>\d+)/$',
        login_required(SingleLayerConstraintDetail.as_view()), name='qdjango-constraint-api-detail'),
    # All Constraint(s) filtered by layer qdjango layer pk
    url(r'^api/constraint/layer/(?P<layer_id>\d+)/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-filter-by-layer-id'),
    # All Constraint(s) filtered by user
    url(r'^api/constraint/user/(?P<user_id>\d+)/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-filter-by-user'),
    # All Constraint(s)
    url(r'^api/constraint/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-list'),

    #############################################################
    # GeoConstraints

    # Detail of a GeoConstraintRule
    url(r'^api/rule/detail/(?P<pk>\d+)/$',
        login_required(GeoConstraintRuleDetail.as_view()), name='geoconstraintrule-api-detail'),
    # All ConstraintRule(s) filtered by editing layer id
    url(r'^api/rule/layer/(?P<layer_id>[-_\w\d]+)/$',
        login_required(GeoConstraintRuleList.as_view()), name='geoconstraintrule-api-filter-by-layer'),
    # All ConstraintRule(s) filtered by User pk
    url(r'^api/rule/user/(?P<user_id>\d+)/$',
        login_required(GeoConstraintRuleList.as_view()), name='geoconstraintrule-api-filter-by-user'),
    # All ConstraintRule(s) filtered by Constraint pk
    url(r'^api/rule/constraint/(?P<constraint_id>\d+)/$',
        login_required(GeoConstraintRuleList.as_view()), name='geoconstraintrule-api-filter-by-constraint'),
    # All ConstraintRule(s)
    url(r'^api/rule/$',
        login_required(GeoConstraintRuleList.as_view()), name='geoconstraintrule-api-list'),
    # Constraint geometry
    url(r'^api/constraint/geometry/(?P<layer_id>[-_\w\d]+)/$',
        login_required(GeoConstraintGEOFeatureAPIView.as_view()), name='geoconstraint-api-geometry'),
    # Detail of a Constraint
    url(r'^api/constraint/detail/(?P<pk>\d+)/$',
        login_required(GeoConstraintDetail.as_view()), name='geoconstraint-api-detail'),
    # All Constraint(s) filtered by editing layer id
    url(r'^api/constraint/(?P<layer_id>[-_\w\d]+)/$',
        login_required(GeoConstraintList.as_view()), name='geoconstraint-api-filter-by-layer'),
    # All Constraint(s)
    url(r'^api/constraint/$',
        login_required(GeoConstraintList.as_view()), name='geoconstraint-api-list'),


    #############################################################
    # OGC (web) services

    # All Service(s)
    url(r'^api/webservice/(?P<project_id>\d+)/$',
        login_required(QdjangoWebServicesAPIview.as_view()), name='qdjango-webservice-api-list'),
]

# Layer style manager
urlpatterns += [
    url(r'^api/layerstyles/(?P<layer_id>\d+)/$',
        login_required(LayerStyleListView.as_view()), name='qdjango-style-list-api'),
    url(r'^api/layerstyles/(?P<layer_id>\d+)/(?P<style_name>[\w\s%-]+)/$',
        login_required(LayerStyleDetailView.as_view()), name='qdjango-style-detail-api'),
]

# API info
urlpatterns += [
    # Other vector layers in project get by qdjango layer id
    url(r'^api/info/layer/polygon/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerPolygonView.as_view()), name='qdjango-api-info-layer-polygon'),
    # Viewers users can editing on editing layer id
    url(r'^api/info/layer/user/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerUserInfoAPIView.as_view()), name='qjango-api-info-layer-user'),
    # Viewers users groups viewer can editing on editing layer id
    url(r'^api/info/layer/authgroup/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerAuthGroupInfoAPIView.as_view()), name='qdjango-api-info-layer-authgroup'),
]
