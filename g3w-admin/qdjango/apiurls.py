from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.projects.views import QdjangoProjectRelationsApiView
from .api.constraints.views import (
    SingleLayerConstraintRuleList,
    SingleLayerConstraintRuleDetail,
    SingleLayerConstraintList,
    SingleLayerConstraintDetail,
)

urlpatterns = [
    url(r'^api/relations/(?P<project_id>[0-9]+)/(?P<relation_id>[-_\w\d]+)/(?P<relation_field_value>[/*\-+,._\w\d]+)$',
        QdjangoProjectRelationsApiView.as_view(),
        name='qdjango-api-project-relations'),
]

# Single layer Constraints
urlpatterns += [
    # Detail of a ConstraintRule
    url(r'^api/rule/detail/(?P<pk>\d+)/$',
        login_required(SingleLayerConstraintRuleDetail.as_view()), name='qdjango-constraintrule-api-detail'),
    # All ConstraintRule(s) filtered by layer qgs_layer_id
    url(r'^api/rule/layer/(?P<qgs_layer_id>[-_\w\d]+)/$',
        login_required(SingleLayerConstraintRuleList.as_view()), name='qdjango-constraintrule-api-filter-by-qgs-layer-id'),
    # All ConstraintRule(s) filtered by layer qdjango layer pk
    url(r'^api/rule/layer/(?P<layer_id>[\d]+)/$',
        login_required(SingleLayerConstraintRuleList.as_view()), name='qdjango-constraintrule-api-filter-by-layer-id'),
    # All ConstraintRule(s) filtered by User pk
    url(r'^api/rule/user/(?P<user_id>\d+)/$',
        login_required(SingleLayerConstraintRuleList.as_view()), name='qdjango-constraintrule-api-filter-by-user'),
    # All ConstraintRule(s) filtered by Constraint pk
    url(r'^api/rule/constraint/(?P<constraint_id>\d+)/$',
        login_required(SingleLayerConstraintRuleList.as_view()), name='qdjango-constraintrule-api-filter-by-constraint'),
    # All ConstraintRule(s)
    url(r'^api/rule/$',
        login_required(SingleLayerConstraintRuleList.as_view()), name='qdjango-constraintrule-api-list'),
    # Detail of a Constraint
    url(r'^api/constraint/detail/(?P<pk>\d+)/$',
        login_required(SingleLayerConstraintDetail.as_view()), name='qdjango-constraint-api-detail'),
    # All Constraint(s) filtered by layer qgs_layer_id
    url(r'^api/constraint/(?P<qgs_layer_id>[-_\w\d]+)/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-filter-by-qgs-layer-id'),
    # All Constraint(s) filtered by layer qdjango layer pk
    url(r'^api/constraint/(?P<layer_id>\d+)/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-filter-by-layer-id'),
    # All Constraint(s)
    url(r'^api/constraint/$',
        login_required(SingleLayerConstraintList.as_view()), name='qdjango-constraint-api-list'),

]
