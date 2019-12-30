# -*- coding: utf-8 -*-
from __future__ import unicode_literals, absolute_import

""""Tests for constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


import json

django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.test import APIClient
from .test_models import ConstraintsTestsBase

# Import for testing Python syntax
from editing.api.constraints.views import *

class EditingApiTests(ConstraintsTestsBase):

    def test_initconfig_plugin_start(self):
        """ Test initconfig api"""

        # activate editing plugins: set editing_layer as editing layer
        G3WEditingLayer.objects.create(app_name='qdjango', layer_id=self.editing_layer.pk)


        # api client instance
        client = APIClient()
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        url = reverse('group-map-config', args=[self.project_group.slug, 'qdjango', self.project.instance.pk])

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        # check archiweb into plugins section
        self.assertTrue('editing' in jcontent['group']['plugins'])

        plugin = jcontent['group']['plugins']['editing']

        # check gid and TYPES
        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(self.project.instance.pk))

        client.logout()

        # check for constraint
        # ===================================

        # add constraints
        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')

        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, user=self.test_user3, rule='name=\'bagnolo\'')
        rule.save()

        self.assertTrue(client.login(username=self.test_user3.username, password=self.test_user3.username))

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        # check archiweb into plugins section
        self.assertTrue('editing' in jcontent['group']['plugins'])

        plugin = jcontent['group']['plugins']['editing']

        # check gid and TYPES
        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(self.project.instance.pk))

        self.assertTrue('constraints' in plugin)
        self.assertEqual(plugin['constraints'][editing_layer.qgs_layer_id]['geometry_api_url'],
                         reverse('constraint-api-geometry', kwargs={'editing_layer_id': editing_layer.pk}))

        constraint.delete()


class ConstraintsApiTests(ConstraintsTestsBase):
    """Constraints API tests"""

    def test_constraint_api(self):
        """Test API constraint CRUD operations"""

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

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
        url = reverse('constraint-api-filter-by-editing', kwargs={'editing_layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(constraint.editing_layer.pk, jcontent['editing_layer'])
        self.assertEqual(constraint.constraint_layer.pk, jcontent['constraint_layer'])

        # No results expected: filter by constraint_layer
        url = reverse('constraint-api-filter-by-editing', kwargs={'editing_layer_id': constraint_layer.pk})
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



    def test_constraint_api_permissions(self):
        """ Test Contraint API permissions """

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')

        # create a contraint
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        # No results expected: filter by constraint_layer
        url_list = reverse('constraint-api-filter-by-editing', kwargs={'editing_layer_id': constraint_layer.pk})
        response = client.get(url_list, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.post(url_list, {}, format='json')
        self.assertEqual(response.status_code, 403)

        url = reverse('constraint-api-detail', kwargs={'pk': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.put(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        client.logout()
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))

        # Pass and workflow CRUD
        # ===============================================
        response = client.get(url_list, {}, format='json')
        self.assertEqual(response.status_code, 200)

        response = client.post(url_list, {
            'editing_layer': editing_layer.pk,
            'constraint_layer': constraint_layer.pk
        }, format='json')
        self.assertEqual(response.status_code, 201)
        jcontent = json.loads(response.content)

        new_constraint_pk = jcontent['pk']

        response = client.put(url, {
            'editing_layer': editing_layer.pk,
            'constraint_layer': constraint_layer.pk,
            'pk': new_constraint_pk
        }, format='json')
        self.assertEqual(response.status_code, 200)

        url = reverse('constraint-api-detail', kwargs={'pk': new_constraint_pk})
        response = client.delete(url)
        self.assertEqual(response.status_code, 204)

        with self.assertRaises(ObjectDoesNotExist) as ex:
            Constraint.objects.get(pk=new_constraint_pk)

    def test_constraintrule_api(self):
        """Test API constraint rule CRUD operations"""

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

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
        url = reverse('constraintrule-api-filter-by-editing', kwargs={'editing_layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('constraintrule-api-filter-by-editing', kwargs={'editing_layer_id': constraint_layer.pk})
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
        url = reverse('constraintrule-api-filter-by-user', kwargs={'user_id': self.test_user3.pk})
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

    def test_constraintrule_api_permissions(self):
        """Test API constraint rule permissions"""

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, user=self.test_user3, group=None, rule="name='pinerolo'")
        rule.save()

        # check 403 for rule list by constraint
        url = reverse('constraintrule-api-filter-by-constraint', kwargs={'constraint_id': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 403 for rule list by editing layer
        url = reverse('constraintrule-api-filter-by-editing', kwargs={'editing_layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 403 for rule list by rule user
        url = reverse('constraintrule-api-filter-by-user', kwargs={'user_id': self.test_user3.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 403 for rule detail
        url = reverse('constraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check pass for rule list by constraint
        client.logout()
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))

        url = reverse('constraintrule-api-filter-by-constraint', kwargs={'constraint_id': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # check 200 for rule list by editing layer
        url = reverse('constraintrule-api-filter-by-editing', kwargs={'editing_layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # check 200 for rule list by rule user
        url = reverse('constraintrule-api-filter-by-user', kwargs={'user_id': self.test_user3.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # check 200 for rule detail
        url = reverse('constraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        client.logout()

        self.assertTrue(client.login(username=self.test_user3.username, password=self.test_user3.username))
        # Test get Geometries contraint for request user
        url = reverse('constraint-api-geometry', kwargs={'editing_layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertTrue(len(jcontent['geometries']) == 1)
        self.assertEqual(jcontent['geometries'][0]['type'], 'MultiPolygon')

        client.logout()
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertTrue(len(jcontent['geometries']) == 0)

    def test_layer_info_api(self):
        """ Tets for layer info API"""

        client = APIClient()
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')

        # testing editing-api-info-layer
        # Retrieve the layers
        url_layer = reverse('editing-api-info-layer', args=[editing_layer.pk])
        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(constraint_layer.pk, jcontent['pk'])

        # testing editing-api-info-layer-user
        url_user = reverse('editing-api-info-layer-user', args=[editing_layer.pk])
        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(self.test_user3.pk, jcontent['pk'])

        # testing editing-api-info-layer-authgroup
        url_group = reverse('editing-api-info-layer-authgroup', args=[editing_layer.pk])
        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(self.group.pk, jcontent['pk'])

        # testing permission
        client.logout();
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 403)

        client.logout();
        self.assertTrue(client.login(username=self.test_user3.username, password=self.test_user3.username))

        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 403)

        client.logout();
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))

        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 200)

        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 200)

        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # bad request
        url_layer = reverse('editing-api-info-layer', args=[9999999])
        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 400)