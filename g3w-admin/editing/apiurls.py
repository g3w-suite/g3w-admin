from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.views import layer_commit_vector_view

from .api.constraints.views import *
from .api.info.views import *

BASE_URLS = 'vector'

urlpatterns = [
    url(r'^api/(?P<mode_call>editing|commit|unlock)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        login_required(layer_commit_vector_view), name='editing-commit-vector-api')
]


# Constraints
urlpatterns += [
    # Detail of a ConstraintRule
    url(r'^api/rule/detail/(?P<pk>\d+)/$',
        login_required(ConstraintRuleDetail.as_view()), name='constraintrule-api-detail'),
    # All ConstraintRule(s) filtered by editing layer qgs_layer_id
    url(r'^api/rule/layer/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(ConstraintRuleList.as_view()), name='constraintrule-api-filter-by-editing'),
    # All ConstraintRule(s) filtered by User pk
    url(r'^api/rule/user/(?P<user_id>\d+)/$',
        login_required(ConstraintRuleList.as_view()), name='constraintrule-api-filter-by-user'),
    # All ConstraintRule(s) filtered by Constraint pk
    url(r'^api/rule/constraint/(?P<constraint_id>\d+)/$',
        login_required(ConstraintRuleList.as_view()), name='constraintrule-api-filter-by-constraint'),
    # All ConstraintRule(s)
    url(r'^api/rule/$',
        login_required(ConstraintRuleList.as_view()), name='constraintrule-api-list'),
    # Constraint geometry
    url(r'^api/constraint/geometry/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(ConstraintGEOFeatureAPIView.as_view()), name='constraint-api-geometry'),
    # Detail of a Constraint
    url(r'^api/constraint/detail/(?P<pk>\d+)/$',
        login_required(ConstraintDetail.as_view()), name='constraint-api-detail'),
    # All Constraint(s) filtered by editing layer qgs_layer_id
    url(r'^api/constraint/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(ConstraintList.as_view()), name='constraint-api-filter-by-editing'),
    # All Constraint(s)
    url(r'^api/constraint/$',
        login_required(ConstraintList.as_view()), name='constraint-api-list'),

]

# Editing info
urlpatterns += [
    # Other vector layers in project get by qdjango layer id
    url(r'^api/info/layer/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(EditingLayerInfo.as_view()), name='editing-api-info-layer'),
    # Viewers users can editing on editing layer id
    url(r'^api/info/layer/user/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(EditingLayerUserInfo.as_view()), name='editing-api-info-layer-user'),
    # Viewers users groups viewer can editing on editing layer id
    url(r'^api/info/layer/authgroup/(?P<editing_layer_id>[-_\w\d]+)/$',
        login_required(EditingLayerAuthGroupInfo.as_view()), name='editing-api-info-layer-authgroup'),
]

