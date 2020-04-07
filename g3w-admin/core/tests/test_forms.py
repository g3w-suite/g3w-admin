# coding=utf-8
""""
    Core forms tests
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-03'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test import TestCase, override_settings
from django.test.client import RequestFactory
from usersmanage.tests.utils import setup_testing_user, teardown_testing_users, setup_testing_user_relations
from core.forms import GroupForm
from core.models import G3WSpatialRefSys, MapControl, Group
from .utils import create_dff_image, clear_dff_image
import copy

@override_settings(CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
})
class CoreTestForm(TestCase):


    fixtures = [
        'BaseLayer.json',
        'G3WMapControls.json',
        'G3WSpatialRefSys.json',
        'G3WGeneralDataSuite.json'
    ]

    @classmethod
    def setUpClass(cls):

        super(CoreTestForm, cls).setUpClass()
        setup_testing_user(cls)
        setup_testing_user_relations(cls)

    @classmethod
    def setUpTestData(cls):

        cls.request = RequestFactory()

        # get epsg test
        cls.epsg = G3WSpatialRefSys.objects.get(srid=4326)
        cls.map_controls = MapControl.objects.all()

    def test_groups_form(self):

        # set user as admin01
        self.request.user = self.test_user1

        # empty form
        form = GroupForm(request=self.request)
        self.assertFalse(form.is_valid())

        # upload header_logo_image
        uf = create_dff_image(field_name='header_logo_img')

        # Test Create
        # ------------------------------
        name = 'Map group test'

        form_data = {
            'title': name,
            'name': name,
            'description': 'Test',
            'srid': self.epsg.pk,
            'form_id': uf.form_id,
            'lang': 'it',
            'mapcontrols': [mp.pk for mp in self.map_controls]
        }

        # Test ACL
        form_data.update({
            'editor_user': self.test_editor1.pk,
            'editor2_user': self.test_editor2.pk,
            'viewer_users': [self.test_viewer1.pk, self.test_viewer1_2.pk],
            'editor_user_groups': [self.test_gu_editor1.pk],
            'viewer_user_groups': [self.test_gu_viewer1.pk, self.test_gu_viewer2.pk]
        })

        form = GroupForm(request=self.request, data=form_data)
        self.assertTrue(form.is_valid())

        # Check possible choices values
        # editor1 editor1.2 editor1.3
        self.assertEqual(len(form.fields['editor_user'].queryset), 3)

        # editor2 editor2.2 editor2.3
        self.assertEqual(len(form.fields['editor2_user'].queryset), 3)

        # viewer1 viewer1.2 viewer1.3 anonymous
        self.assertEqual(len(form.fields['viewer_users'].queryset), 4)

        # GU_EDITOR1 GU_EDITOR2 GU_EDITOR1_E1_2
        self.assertEqual(len(form.fields['editor_user_groups'].queryset), 3)

        # GU_VIEWER1 GU_VIEWER2 GU_VIEWER_E1_2
        self.assertEqual(len(form.fields['viewer_user_groups'].queryset), 3)

        form.save()

        # check is it saved into db
        mg = Group.objects.get(name='Map group test')
        self.assertEqual(mg.name, name)
        self.assertEqual(mg.srid.srid, self.epsg.srid)

        # check ACL
        self.assertTrue(self.test_editor1.has_perm('core.change_group', mg))
        self.assertFalse(self.test_editor2.has_perm('core.change_group', mg))
        self.assertTrue(self.test_editor1.has_perm('core.add_project_to_group', mg))
        self.assertTrue(self.test_editor2.has_perm('core.add_project_to_group', mg))
        self.assertTrue(self.test_viewer1.has_perm('core.view_group', mg))
        self.assertTrue(self.test_viewer1_2.has_perm('core.view_group', mg))
        self.assertTrue(self.test_editor2_3.has_perm('core.add_project_to_group', mg))
        self.assertTrue(self.test_viewer1_3.has_perm('core.view_group', mg))

        # Test Update
        # ------------------------------

        initial_form_data = copy.copy(form_data)

        name = 'Map group test update'
        form_data.update({
            'name': name,
        })

        # Test ACL
        form_data.update({
            'editor_user': self.test_editor1_2.pk,
            'editor2_user': self.test_editor2_2.pk,
            'viewer_users': [self.test_viewer1_3.pk],
            'editor_user_groups': [],
            'viewer_user_groups': []
        })

        form = GroupForm(request=self.request, data=form_data, instance=mg, initial=initial_form_data)
        self.assertTrue(form.is_valid())
        form.save()

        # Reload form db
        mg.refresh_from_db()
        self.assertEqual(mg.name, name)

        # check ACL
        self.assertFalse(self.test_editor1.has_perm('core.change_group', mg))
        self.assertTrue(self.test_editor1_2.has_perm('core.change_group', mg))
        self.assertFalse(self.test_editor2.has_perm('core.change_group', mg))
        self.assertFalse(self.test_editor2_2.has_perm('core.change_group', mg))
        self.assertTrue(self.test_editor1_2.has_perm('core.add_project_to_group', mg))
        self.assertTrue(self.test_editor2_2.has_perm('core.add_project_to_group', mg))
        self.assertTrue(self.test_viewer1_3.has_perm('core.view_group', mg))
        self.assertFalse(self.test_viewer1_2.has_perm('core.view_group', mg))
        self.assertFalse(self.test_editor2_3.has_perm('core.add_project_to_group', mg))
        self.assertTrue(self.test_viewer1_3.has_perm('core.view_group', mg))

        # Testing for editor level 1 use
        # ====================================================
        # editor1
        # -----------------
        self.request.user = self.test_editor1

        form = GroupForm(request=self.request)
        self.assertFalse(form.is_valid())

        self.assertCountEqual(form.fields['editor2_user'].queryset, [])

        # editor1.2
        # -----------------
        self.request.user = self.test_editor1_2

        form = GroupForm(request=self.request)
        self.assertFalse(form.is_valid())

        # editor2.2 and editor2.3
        self.assertEqual(len(form.fields['editor2_user'].queryset), 2)
        self.assertEqual(list(form.fields['editor2_user'].queryset), [self.test_editor2_2, self.test_editor2_3])

        # Anonymous user always present
        # Anonymoususer, viewer2.3
        self.assertEqual(len(form.fields['viewer_users'].queryset), 2)
        self.assertEqual(list(form.fields['viewer_users'].queryset), [self.anonymoususer, self.test_viewer1_3])

        # Only editor and viewer user groups for test_editor1_2
        self.assertEqual(len(form.fields['editor_user_groups'].queryset), 1)
        self.assertEqual(len(form.fields['viewer_user_groups'].queryset), 1)


    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        clear_dff_image()