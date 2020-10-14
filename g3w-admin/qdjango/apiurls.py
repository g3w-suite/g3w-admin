from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.layers.views import LayerUserInfoAPIView, LayerAuthGroupInfoAPIView
from .api.constraints.views import (
    ConstraintExpressionRuleDetail,
    ConstraintExpressionRuleList,
    ConstraintSubsetStringRuleDetail,
    ConstraintSubsetStringRuleList,
    SingleLayerConstraintDetail,
    SingleLayerConstraintList,
)
from .api.projects.views import (
    QdjangoWebServicesAPIview
)

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
    # OGC (web) services

    # All Service(s)
    url(r'^api/webservice/(?P<project_id>\d+)/$',
        login_required(QdjangoWebServicesAPIview.as_view()), name='qdjango-webservice-api-list'),
]


# API info
urlpatterns += [
    # Viewers users can editing on editing layer id
    url(r'^api/info/layer/user/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerUserInfoAPIView.as_view()), name='qjango-api-info-layer-user'),
    # Viewers users groups viewer can editing on editing layer id
    url(r'^api/info/layer/authgroup/(?P<layer_id>[-_\w\d]+)/$',
        login_required(LayerAuthGroupInfoAPIView.as_view()), name='qdjango-api-info-layer-authgroup'),
]