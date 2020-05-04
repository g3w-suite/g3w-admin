from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.projects.views import QdjangoProjectRelationsApiView
from .api.constraints.views import (
    ConstraintExpressionRuleDetail,
    ConstraintExpressionRuleList,
    ConstraintSubsetStringRuleDetail,
    ConstraintSubsetStringRuleList,
    SingleLayerConstraintDetail,
    SingleLayerConstraintList,
)

urlpatterns = [
    url(r'^api/relations/(?P<project_id>[0-9]+)/(?P<relation_id>[-_\w\d]+)/(?P<relation_field_value>[/*\-+,._\w\d]+)$',
        QdjangoProjectRelationsApiView.as_view(),
        name='qdjango-api-project-relations'),
]

# Single layer Constraints
urlpatterns += [

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
    url(r'^api/constraint/(?P<layer_id>\d+)/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-filter-by-layer-id'),
    # All Constraint(s) filtered by user
    url(r'^api/constraint/(?P<user_id>\d+)/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-filter-by-user'),
    # All Constraint(s)
    url(r'^api/constraint/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-list'),

]
