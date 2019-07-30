# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Tests for constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


import json

from django.core.urlresolvers import reverse
from guardian.shortcuts import assign_perm
from rest_framework.test import APIClient

from constraints.models import *
from qdjango.models import Layer

from .test_models import ConstraintsTestsBase

# Import for testing Python syntax
from constraints.api.views import *

class ConstraintsApiTests(ConstraintsTestsBase):
    """Constraints API tests"""

    def test_constraint_api(self):
        """Test API constraint CRUD operations"""

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))

        # Test empty record set
        url = reverse('constraint-api-list')
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Create a constraint
        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        url = reverse('constraint-api-list')
        response = client.post(url, {
            'editing_layer': editing_layer.pk,
            'constraint_layer': constraint_layer.pk,
            }, format='json')
        self.assertEqual(response.status_code, 201)
        jcontent = json.loads(response.content)
        self.assertEqual(Constraint.objects.count(), 1)
        constraint = Constraint.objects.all()[0]
        self.assertEqual(constraint.editing_layer.pk, jcontent['editing_layer'])
        self.assertEqual(constraint.constraint_layer.pk, jcontent['constraint_layer'])

        # Retrieve the constraint
        url = reverse('constraint-api-list')
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(constraint.editing_layer.pk, jcontent['editing_layer'])
        self.assertEqual(constraint.constraint_layer.pk, jcontent['constraint_layer'])

        # Update the constraint (must fail because it's self linked)
        url = reverse('constraint-api-list')
        response = client.post(url, {
            'editing_layer': constraint_layer.pk,
            'constraint_layer': constraint_layer.pk,
            'pk': constraint.pk
        }, format='json')
        # Bad request
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error' in jcontent)

        # Filter by editing layer id
        url = reverse('constraint-api-filter-by-editing', kwargs={'editing_layer_id': editing_layer.qgs_layer_id})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(constraint.editing_layer.pk, jcontent['editing_layer'])
        self.assertEqual(constraint.constraint_layer.pk, jcontent['constraint_layer'])

        # No results expected: filter by constraint_layer
        url = reverse('constraint-api-filter-by-editing', kwargs={'editing_layer_id': constraint_layer.qgs_layer_id})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Get by pk
        url = reverse('constraint-api-detail',  kwargs={'pk': constraint.pk })
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(constraint.editing_layer.pk, jcontent['editing_layer'])
        self.assertEqual(constraint.constraint_layer.pk, jcontent['constraint_layer'])

        # Update the constraint (must fail because it's self linked)
        url = reverse('constraint-api-detail',  kwargs={'pk': constraint.pk })
        response = client.put(url, {
            'editing_layer': constraint_layer.pk,
            'constraint_layer': constraint_layer.pk,
        }, format='json')
        # Bad request
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error' in jcontent)

        # Delete
        url = reverse('constraint-api-detail',  kwargs={'pk': constraint.pk })
        response = client.delete(url, {}, format='json')
        self.assertEqual(Constraint.objects.count(), 0)


    def test_constraintrule_api(self):
        """Test API constraint rule CRUD operations"""

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        # Create a valid rule
        url = reverse('constraintrule-api-list')
        response = client.post(url, {
            'constraint': constraint.pk,
            'user': self.test_user2.pk,
            'group': None,
            'rule': 'name=\'bagnolo\'',
            }, format='json')
        self.assertEqual(response.status_code, 201)
        jcontent = json.loads(response.content)
        self.assertTrue('pk' in jcontent)
        rule_pk = jcontent['pk']
        rule = ConstraintRule.objects.get(pk=rule_pk)
        self.assertEqual(rule.user.pk, jcontent['user'])
        self.assertEqual(rule.group, jcontent['group'])
        self.assertEqual(rule.rule, jcontent['rule'])
        self.assertEqual(rule.constraint.pk, jcontent['constraint'])

        # Create an invalid rule (duplicated key)
        url = reverse('constraintrule-api-list')
        response = client.post(url, {
            'constraint': constraint.pk,
            'user': self.test_user2.pk,
            'group': None,
            'rule': 'wrong_field_name=\'bagnolo\'',
            }, format='json')
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error', jcontent)

        # Create an invalid rule wrong field name
        url = reverse('constraintrule-api-list')
        response = client.post(url, {
            'constraint': constraint.pk,
            'user': None,
            'group': self.group.pk,
            'rule': 'wrong_field_name=\'bagnolo\'',
            }, format='json')
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error', jcontent)

        # Retrieve the rules
        url = reverse('constraintrule-api-list')
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        # Retrieve the rules for a user
        url = reverse('constraintrule-api-filter-by-user', kwargs={'user_id': self.test_user2.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('constraintrule-api-filter-by-user', kwargs={'user_id': self.test_user1.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Retrieve the rules for an editing layer
        url = reverse('constraintrule-api-filter-by-editing', kwargs={'editing_layer_id': editing_layer.qgs_layer_id})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('constraintrule-api-filter-by-editing', kwargs={'editing_layer_id': constraint_layer.qgs_layer_id})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Retrieve the rules for a constraint
        url = reverse('constraintrule-api-filter-by-constraint', kwargs={'constraint_id': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('constraintrule-api-filter-by-constraint', kwargs={'constraint_id': 999999})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Test UPDATE user group
        url = reverse('constraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.put(url, {
            'constraint': constraint.pk,
            'user': None,
            'group': self.group.pk,
            'rule': 'name=\'bagnolo\'',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        rule = ConstraintRule.objects.get(pk=rule_pk)
        self.assertEqual(rule.user, jcontent['user'])
        self.assertEqual(rule.group.pk, jcontent['group'])
        self.assertEqual(rule.rule, jcontent['rule'])
        self.assertEqual(rule.constraint.pk, jcontent['constraint'])

        # Test retrieve rule for user (now that it is a group rule)
        url = reverse('constraintrule-api-filter-by-user', kwargs={'user_id': self.test_user2.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        # Test retrieve RULE by pk
        url = reverse('constraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.get(url, {}, format='json')
        jcontent = json.loads(response.content)
        self.assertEqual(rule.user, jcontent['user'])
        self.assertEqual(rule.group.pk, jcontent['group'])
        self.assertEqual(rule.rule, jcontent['rule'])
        self.assertEqual(rule.constraint.pk, jcontent['constraint'])

        # Test delete RULE
        url = reverse('constraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.delete(url, {}, format='json')
        self.assertEqual(ConstraintRule.objects.count(), 0)