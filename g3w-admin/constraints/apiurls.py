# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""API URLs for constraints module

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-29'
__copyright__ = 'Copyright 2019, Gis3w'

from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from constraints.api.views import *

BASE_URLS = 'constraint'

urlpatterns = [
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