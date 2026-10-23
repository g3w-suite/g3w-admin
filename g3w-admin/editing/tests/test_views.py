# coding=utf-8
""""Test for editing views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-08-23'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'


from django.core.exceptions import ObjectDoesNotExist
from django.test import override_settings
from django.urls import reverse
from guardian.shortcuts import (
    assign_perm,
    get_perms
)
from rest_framework.test import APIClient

from editing.models import (
    G3WEditingLayer,
    EDITING_ATOMIC_PERMISSIONS
)

from .test_models import DATASOURCE_PATH, ConstraintsTestsBase

@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
},
    DATASOURCE_PATH=DATASOURCE_PATH,
    G3WADMIN_LOCAL_MORE_APPS=[
        'editing',
    ],
    EDITING_ANONYMOUS=True,
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
)
)
class EditingViewsTests(ConstraintsTestsBase):
    """Test for editing module views"""

    def setUp(self):
        self.client = APIClient()
        super().setUp()

    def tearDown(self):
        super().tearDown()
        self.client.logout()

    def test_editing_layer_active(self):
        """Test same name view"""

        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.filter(
            qgs_layer_id=cities_layer_id)[0]

        # Not activated
        with self.assertRaises(ObjectDoesNotExist) as ex:
            G3WEditingLayer.objects.get(layer_id=cities_layer.pk)

        # Test ONLY POST
        # TEST activate/deactivate editing
        url = reverse('editing-layer-active', args=[
            self.editing_project.instance.group.slug,
            'qdjango',
            self.editing_project.instance.slug,
            cities_layer.pk
        ])

        data = {
            'active': 'on',
            'scale': 10000
        }

        self.assertTrue(self.client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id=cities_layer.pk)
        self.assertTrue(len(editing_layers) == 1)
        self.assertEqual(editing_layers[0].scale, 10000)

        # Check ATOMIC permissions
        # ========================

        # Give permissions to viewers and user_groups viewers
        assign_perm('view_project', self.test_user3, self.editing_project.instance)
        assign_perm('view_project', self.test_user_group1, self.editing_project.instance)

        data.update({
            'viewer_users': [self.test_user3.pk],
            'user_groups_viewer': [self.test_user_group1.pk]
        })

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        data.update({
            'viewer_users': [self.test_user3.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            f'user_delete_capability_{self.test_user3.pk}': 'on',
            'user_groups_viewer': [self.test_user_group1.pk],
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_change_capability_{self.test_user_group1.pk}': 'on',
        })

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        data = {
            'active': 'on',
            'scale': 10000,
            'viewer_users': [self.test_user3.pk],
            'user_groups_viewer': [self.test_user_group1.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            f'user_change_capability_{self.test_user3.pk}': 'on',
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_changeattributes_capability_{self.test_user_group1.pk}': 'on',
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        data = {
            'active': 'on',
            'scale': 10000,
            'viewer_users': [],
            'user_groups_viewer': [self.test_user_group1.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            f'user_change_capability_{self.test_user3.pk}': 'on',
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_changeattributes_capability_{self.test_user_group1.pk}': 'on',
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertFalse(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        data = {
            'scale': 10000,
            'viewer_users': [],
            'user_groups_viewer': [self.test_user_group1.pk],
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_changeattributes_capability_{self.test_user_group1.pk}': 'on',
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertFalse(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertFalse(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

    def test_editing_multi_layer_active(self):
        """ Testing view for activation of editing capability on multi layer """

        # Get qdjango layer instances
        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.get(
            qgs_layer_id=cities_layer_id)

        # Get layer
        countries_layer_id = 'countries_63e59c18_a1d0_4e25_968a_ccbaecd11725'
        countries_layer = self.editing_project.instance.layer_set.get(
            qgs_layer_id=countries_layer_id)

        # Not activated
        with self.assertRaises(ObjectDoesNotExist) as ex:
            G3WEditingLayer.objects.get(layer_id=cities_layer.pk)

        with self.assertRaises(ObjectDoesNotExist) as ex:
            G3WEditingLayer.objects.get(layer_id=countries_layer.pk)

        # TEST activate/deactivate editing
        url = reverse('editing-multi-layer-active', args=[
            self.editing_project.instance.group.slug,
            'qdjango',
            self.editing_project.instance.slug
        ])

        data = {
            'active': 'on',
            'layers': [cities_layer.pk, countries_layer.pk],
            'scale': 10000
        }

        self.assertTrue(
            self.client.login(
                username=self.test_user_admin1.username,
                password=self.test_user_admin1.username
            )
        )

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id__in=[cities_layer.pk, countries_layer.pk])
        self.assertTrue(len(editing_layers) == 2)
        self.assertEqual(editing_layers[0].scale, 10000)
        self.assertEqual(editing_layers[1].scale, 10000)

        # Check ATOMIC permissions
        # ========================

        # Give permissions to viewers and user_groups viewers
        assign_perm('view_project', self.test_user3, self.editing_project.instance)
        assign_perm('view_project', self.test_user_group1, self.editing_project.instance)

        data.update({
            'viewer_users': [self.test_user3.pk],
            'user_groups_viewer': [self.test_user_group1.pk]
        })

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', countries_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', countries_layer))

        data.update({
            'layers': [cities_layer.pk],
            'viewer_users': [self.test_user3.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            f'user_delete_capability_{self.test_user3.pk}': 'on',
            'user_groups_viewer': [self.test_user_group1.pk],
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_change_capability_{self.test_user_group1.pk}': 'on',
        })

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', countries_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', countries_layer))

        data = {
            'layers': [cities_layer.pk, countries_layer.pk],
            'active': 'on',
            'scale': 10000,
            'viewer_users': [self.test_user3.pk],
            'user_groups_viewer': [self.test_user_group1.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            f'user_change_capability_{self.test_user3.pk}': 'on',
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_changeattributes_capability_{self.test_user_group1.pk}': 'on',
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', countries_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', countries_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', countries_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', countries_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', countries_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_attr_feature', countries_layer))

        # Deactive editing for countries_layer
        data = {
            'layers': [countries_layer.pk],
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id__in=[cities_layer.pk, countries_layer.pk])
        self.assertTrue(len(editing_layers) == 1)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertFalse(self.test_user3.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', countries_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertFalse(self.test_user4.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', countries_layer))

        # Deactive editing for all 2 layers
        data = {
            'layers': [countries_layer.pk, cities_layer.pk],
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id__in=[cities_layer.pk, countries_layer.pk])
        self.assertTrue(len(editing_layers) == 0)

        # Users
        self.assertFalse(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertFalse(self.test_user3.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', countries_layer))

        # User_groups
        self.assertFalse(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        self.assertFalse(self.test_user4.has_perm('qdjango.change_layer', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.add_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', countries_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', countries_layer))


        # Test override of single layer editing property
        # ----------------------------------------------

        url_single_layer = reverse('editing-layer-active', args=[
            self.editing_project.instance.group.slug,
            'qdjango',
            self.editing_project.instance.slug,
            cities_layer.pk
        ])

        data = {
            'active': 'on',
            'scale': 10000,
            'viewer_users': [self.test_user3.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            f'user_delete_capability_{self.test_user3.pk}': 'on',
            'user_groups_viewer': [self.test_user_group1.pk],
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
            f'group_change_capability_{self.test_user_group1.pk}': 'on',
        }

        res = self.client.post(url_single_layer, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

        # Override
        data = {
            'active': 'on',
            'layers': [cities_layer.pk],
            'scale': 10000,
            'viewer_users': [self.test_user3.pk],
            f'user_add_capability_{self.test_user3.pk}': 'on',
            'user_groups_viewer': [self.test_user_group1.pk],
            f'group_add_capability_{self.test_user_group1.pk}': 'on',
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        # Users
        self.assertTrue(self.test_user3.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user3.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user3.has_perm('qdjango.change_attr_feature', cities_layer))

        # User_groups
        self.assertTrue(self.test_user4.has_perm('qdjango.change_layer', cities_layer))
        self.assertTrue(self.test_user4.has_perm('qdjango.add_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.delete_feature', cities_layer))
        self.assertFalse(self.test_user4.has_perm('qdjango.change_attr_feature', cities_layer))

    def test_editing_layer_active_logging_fields(self):
        """ Test active logging fields for insert and update """

        editing_layer = self.logging_project.instance.layer_set.all()[0]

        # Not activated
        with self.assertRaises(ObjectDoesNotExist) as ex:
            G3WEditingLayer.objects.get(layer_id=editing_layer.pk)

        # Test ONLY POST
        # TEST activate/deactivate editing
        url = reverse('editing-layer-active', args=[
            self.editing_project.instance.group.slug,
            'qdjango',
            self.editing_project.instance.slug,
            editing_layer.pk
        ])

        data = {
            'active': 'on',
        }

        self.assertTrue(self.client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id=editing_layer.pk)
        self.assertTrue(len(editing_layers) == 1)
        self.assertFalse(editing_layers[0].add_user_field)
        self.assertFalse(editing_layers[0].edit_user_field)

        data = {
            'active': 'on',
            'add_user_field': 'insert_log',
            'edit_user_field': 'insert_log',
            'add_user_group_field': 'insert_log',
            'edit_user_group_field': 'insert_log'
        }

        res = self.client.post(url, data)

        # no redirect same value for user fields
        self.assertEqual(res.status_code, 200)

        editing_layers = G3WEditingLayer.objects.filter(layer_id=editing_layer.pk)
        self.assertTrue(len(editing_layers) == 1)
        self.assertFalse(editing_layers[0].add_user_field)
        self.assertFalse(editing_layers[0].edit_user_field)
        self.assertFalse(editing_layers[0].add_user_group_field)
        self.assertFalse(editing_layers[0].edit_user_group_field)

        data = {
            'active': 'on',
            'add_user_field': 'insert_log',
            'edit_user_field': 'update_log',
            'add_user_group_field': '',
            'edit_user_group_field': ''
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id=editing_layer.pk)
        self.assertTrue(len(editing_layers) == 1)
        self.assertEqual(editing_layers[0].add_user_field, 'insert_log')
        self.assertEqual(editing_layers[0].edit_user_field, 'update_log')
        self.assertFalse(editing_layers[0].add_user_group_field)
        self.assertFalse(editing_layers[0].edit_user_group_field)

        data = {
            'active': 'on',
            'add_user_group_field': 'insert_log',
            'edit_user_group_field': 'update_log'
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id=editing_layer.pk)
        self.assertTrue(len(editing_layers) == 1)
        self.assertFalse(editing_layers[0].add_user_field)
        self.assertFalse(editing_layers[0].edit_user_field)
        self.assertEqual(editing_layers[0].add_user_group_field, 'insert_log')
        self.assertEqual(editing_layers[0].edit_user_group_field, 'update_log')


        data = {
            'active': 'on',
            'add_user_field': '',
            'edit_user_field': '',
            'add_user_group_field': '',
            'edit_user_group_field': ''
        }

        res = self.client.post(url, data)

        # redirect on ok results
        self.assertEqual(res.status_code, 302)

        editing_layers = G3WEditingLayer.objects.filter(layer_id=editing_layer.pk)
        self.assertTrue(len(editing_layers) == 1)
        self.assertFalse(editing_layers[0].add_user_field)
        self.assertFalse(editing_layers[0].edit_user_field)
        self.assertFalse(editing_layers[0].add_user_group_field)
        self.assertFalse(editing_layers[0].edit_user_group_field)



    def test_copy_permissions(self):
        """
        Test the copy permissions between users with users and groups with groups
        """

        # Get qdjango layer instances
        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.get(
            qgs_layer_id=cities_layer_id)

        # Get layer
        countries_layer_id = 'countries_63e59c18_a1d0_4e25_968a_ccbaecd11725'
        countries_layer = self.editing_project.instance.layer_set.get(
            qgs_layer_id=countries_layer_id)

        # Activate editing
        G3WEditingLayer.objects.create(app_name='qdjango', layer_id=cities_layer.pk)
        G3WEditingLayer.objects.create(app_name='qdjango', layer_id=countries_layer.pk)

        # Give editing permissions
        # Give permissions to viewers and user_groups viewers
        # ---------------------------------------------------
        assign_perm('view_project', self.test_user3, self.editing_project.instance)
        assign_perm('view_project', self.test_user_group1, self.editing_project.instance)
        assign_perm('view_project', self.test_user5, self.editing_project.instance)
        assign_perm('view_project', self.test_user_group2, self.editing_project.instance)
        assign_perm('view_project', self.test_user_group3, self.editing_project.instance)

        # Give general and atomic permission to users and groups
        # ------------------------------------------------------
        assign_perm('change_layer', self.test_user3, cities_layer)
        assign_perm('change_layer', self.test_user_group3, cities_layer)

        for perm in EDITING_ATOMIC_PERMISSIONS:
            assign_perm(perm, self.test_user3, cities_layer)

        for perm in ('change_feature', 'delete_feature'):
            assign_perm(perm, self.test_user_group3, cities_layer)

        assign_perm('change_layer', self.test_user5, countries_layer)
        assign_perm('change_layer', self.test_user_group1, countries_layer)

        for perm in EDITING_ATOMIC_PERMISSIONS:
            assign_perm(perm, self.test_user_group1, countries_layer)

        for perm in ('add_feature', ):
            assign_perm(perm, self.test_user5, countries_layer)

        # Test users and groups don't have permission
        # For cities_layer
        self.assertFalse(self.test_user5.has_perm('change_layer', cities_layer))
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(self.test_user5.has_perm(perm, cities_layer))

        test_user_group1_perms = get_perms(self.test_user_group1, cities_layer)
        self.assertFalse('change_layer' in test_user_group1_perms)
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(perm in test_user_group1_perms)

        # For countries_layer
        self.assertFalse(self.test_user3.has_perm('change_layer', countries_layer))
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(self.test_user3.has_perm(perm, countries_layer))

        test_user_group3_perms = get_perms(self.test_user_group3, countries_layer)
        self.assertFalse('change_layer' in test_user_group3_perms)
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(perm in test_user_group3_perms)

        # Copy permissions
        # ----------------

        self.assertTrue(
            self.client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        url = reverse('editing-copy-permission', args=[
            self.editing_project.instance.group.slug,
            'qdjango',
            self.editing_project.instance.slug
        ])

        data = {
            'from_user': str(self.test_user3.pk),
            'to_users': [str(self.test_user5.pk)],
            'from_group': str(self.test_user_group3.pk),
            'to_groups': [str(self.test_user_group2.pk), str(self.test_user_group1.pk)]
        }

        res = self.client.post(url, data)

        # Check for cities_layer
        self.assertTrue(self.test_user5.has_perm('change_layer', cities_layer))
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertTrue(self.test_user5.has_perm(perm, cities_layer))

        test_user_group2_perms = get_perms(self.test_user_group2, cities_layer)
        test_user_group1_perms = get_perms(self.test_user_group1, cities_layer)
        self.assertFalse('add_feature' in test_user_group2_perms)
        self.assertFalse('add_feature' in test_user_group1_perms)
        self.assertTrue('change_layer' in test_user_group2_perms)
        self.assertTrue('change_layer' in test_user_group1_perms)
        for perm in ('change_feature', 'delete_feature'):
            self.assertTrue(perm in test_user_group2_perms)
            self.assertTrue(perm in test_user_group1_perms)

        # Check countries_layer
        # Check the user3 permissions are unchanged
        self.assertFalse(self.test_user3.has_perm('change_layer', countries_layer))
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(self.test_user3.has_perm(perm, countries_layer))

        test_user_group3_perms = get_perms(self.test_user_group3, countries_layer)
        self.assertFalse('change_layer' in test_user_group3_perms)
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(perm in test_user_group3_perms)

        # test_user_group3 doesn't any permission on countries_layer
        # so on copy action test_user_group1 loses every permission on the layer
        test_user_group1_perms = get_perms(self.test_user_group1, countries_layer)
        self.assertFalse('change_layer' in test_user_group1_perms)
        for perm in EDITING_ATOMIC_PERMISSIONS:
            self.assertFalse(perm in test_user_group1_perms)

        self.client.logout()


