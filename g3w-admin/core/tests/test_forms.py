# coding=utf-8
""""
    Core forms tests
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-03'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test.client import RequestFactory
from django.forms.models import model_to_dict
from guardian.shortcuts import assign_perm
from usersmanage.tests.utils import setup_testing_user_relations
from core.forms import GroupForm, MacroGroupForm, GeneralSuiteDataForm
from core.models import G3WSpatialRefSys, MapControl, Group, MacroGroup, GeneralSuiteData
from .base import CoreTestBase
from .utils import create_dff_image
import copy


class CoreTestForm(CoreTestBase):

    @classmethod
    def setUpClass(cls):

        super(CoreTestForm, cls).setUpClass()
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
        self.assertTrue(self.test_editor2.has_perm('core.change_group', mg))
        self.assertTrue(self.test_editor2.has_perm('core.delete_group', mg))
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
        self.assertFalse(self.test_editor2.has_perm('core.delete_group', mg))
        self.assertTrue(self.test_editor2_2.has_perm('core.change_group', mg))
        self.assertTrue(self.test_editor2_2.has_perm('core.delete_group', mg))
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
        self.assertEqual(list(form.fields['editor2_user'].queryset.order_by('pk')), [self.test_editor2_2, self.test_editor2_3])

        # Anonymous user always present
        # Anonymoususer, viewer2.3
        self.assertEqual(len(form.fields['viewer_users'].queryset), 2)
        self.assertEqual(list(form.fields['viewer_users'].queryset.order_by('pk')), [self.anonymoususer, self.test_viewer1_3])

        # Only editor and viewer user groups for test_editor1_2
        self.assertEqual(len(form.fields['editor_user_groups'].queryset), 1)
        self.assertEqual(len(form.fields['viewer_user_groups'].queryset), 1)

    def test_editor2_group_creation_grants_editor1_owners(self):
        owners = (self.test_editor1, self.test_editor1_2)
        for owner in owners:
            assign_perm('auth.change_user', owner, self.test_editor2_2)

        for creator, expected_owners in (
            (self.test_editor2_2, owners),
            (self.test_editor2, ()),
        ):
            with self.subTest(creator=creator.username):
                self.request.user = creator
                upload = create_dff_image(field_name='header_logo_img')
                form = GroupForm(request=self.request, data={
                    'name': f'created-by-{creator.pk}',
                    'title': 'Created by Editor 2',
                    'srid': self.epsg.pk,
                    'form_id': upload.form_id,
                    'lang': 'it',
                    'mapcontrols': [control.pk for control in self.map_controls],
                })
                self.assertTrue(form.is_valid(), form.errors)
                form.save()
                group = form.instance
                for permission in ('view_group', 'change_group', 'delete_group'):
                    self.assertTrue(creator.has_perm(f'core.{permission}', group))
                    for owner in (*owners, self.test_editor1_3):
                        self.assertEqual(
                            owner.has_perm(f'core.{permission}', group),
                            owner in expected_owners
                        )

    def test_editor2_acl_choices_follow_editor1_owners(self):
        self.request.user = self.test_editor2_2
        form = GroupForm(request=self.request)
        self.assertCountEqual(
            form.fields['viewer_users'].queryset, [self.test_viewer1_3, self.anonymoususer]
        )
        self.assertCountEqual(
            form.fields['viewer_user_groups'].queryset, [self.test_gu_viewer1_e1_2]
        )
        form = GroupForm(
            request=self.request, data={'viewer_users': [self.test_viewer1.pk]}
        )
        self.assertFalse(form.is_valid())
        self.assertIn('viewer_users', form.errors)

        assign_perm('auth.change_user', self.test_editor1, self.test_editor2_2)
        assign_perm('auth.change_user', self.test_editor1, self.test_viewer1)
        assign_perm('auth.change_group', self.test_editor1, self.test_gu_viewer1)
        form = GroupForm(request=self.request)
        self.assertCountEqual(
            form.fields['viewer_users'].queryset,
            [self.test_viewer1, self.test_viewer1_3, self.anonymoususer]
        )
        self.assertCountEqual(
            form.fields['viewer_user_groups'].queryset,
            [self.test_gu_viewer1, self.test_gu_viewer1_e1_2]
        )

        self.request.user = self.test_editor2
        form = GroupForm(request=self.request)
        self.assertCountEqual(
            form.fields['viewer_users'].queryset,
            [self.test_viewer1, self.test_viewer1_2, self.test_viewer1_3, self.anonymoususer]
        )
        self.assertEqual(form.fields['viewer_user_groups'].queryset.count(), 3)

    def test_editor2_group_edit_preserves_macrogroups(self):
        group = Group.objects.create(
            name='macrogroup-preservation', title='Original title',
            srid=self.epsg, header_logo_img=''
        )
        visible = MacroGroup.objects.create(name='visible', title='Visible', logo_img='')
        hidden = MacroGroup.objects.create(name='hidden', title='Hidden', logo_img='')
        other = MacroGroup.objects.create(name='other', title='Other', logo_img='')
        group.macrogroups.set([visible, hidden])
        assign_perm('view_macrogroup', self.test_editor2, visible)
        assign_perm('view_macrogroup', self.test_editor2, other)
        self.request.user = self.test_editor2
        upload = create_dff_image(field_name='header_logo_img')
        data = {
            'name': group.name,
            'title': 'Updated title',
            'srid': self.epsg.pk,
            'form_id': upload.form_id,
            'lang': 'it',
            'mapcontrols': [control.pk for control in self.map_controls],
        }

        for submitted in ({}, {'macrogroups': [other.pk]}):
            with self.subTest(submitted=submitted):
                form = GroupForm(request=self.request, instance=group, data={**data, **submitted})
                self.assertIn(visible, form.fields['macrogroups'].queryset)
                self.assertNotIn(hidden, form.fields['macrogroups'].queryset)
                self.assertTrue(form.is_valid(), form.errors)
                form.save()
                group.refresh_from_db()
                self.assertEqual(group.title, 'Updated title')
                self.assertCountEqual(group.macrogroups.all(), [visible, hidden])

    def test_macrogroups_form(self):
        """ Test for Macrogroup map object form """

        # set user as admin01
        self.request.user = self.test_user1

        # empty form
        form = MacroGroupForm(initial={})
        self.assertFalse(form.is_valid())

        # upload logo_img
        uf = create_dff_image(field_name='logo_img')

        # Test Create
        # ===============================
        name = 'Macro map group test'

        form_data = {
            'title': name,
            'name': name,
            'description': 'Test',
            'form_id': uf.form_id,
            'use_title_client': False,
            'use_logo_client': False
        }

        # Test ACL
        form_data.update({
            'editor_users': [self.test_editor1_3.pk]
        })

        form = MacroGroupForm(data=form_data, initial={})
        self.assertTrue(form.is_valid())

        # Check possible choices values
        # editor1 editor1.2 editor1.3
        self.assertEqual(len(form.fields['editor_users'].queryset), 3)

        form.save()

        # check is it saved into db
        mg = MacroGroup.objects.get(name=form_data['name'])
        self.assertEqual(mg.name, name)

        # check ACl after save
        self.assertFalse(self.test_editor1.has_perm('core.view_macrogroup', mg))
        self.assertFalse(self.test_editor1_2.has_perm('core.view_macrogroup', mg))
        self.assertTrue(self.test_editor1_3.has_perm('core.view_macrogroup', mg))

        # Test UPDATE
        # ==============================

        initial_data = copy.copy(form_data)
        updated_name = 'Updated name'

        form_data['name'] = updated_name
        form_data['editor_users'] = []

        form = MacroGroupForm(data=form_data, initial=initial_data, instance=mg)
        self.assertTrue(form.is_valid())

        form.save()

        # check is it saved into db
        mg.refresh_from_db()
        self.assertEqual(mg.name, updated_name)

        # check ACl after save
        self.assertFalse(self.test_editor1.has_perm('core.view_macrogroup', mg))
        self.assertFalse(self.test_editor1_2.has_perm('core.view_macrogroup', mg))
        self.assertFalse(self.test_editor1_3.has_perm('core.view_macrogroup', mg))

    def test_generalsuitedata_form(self):
        """ Test for GeneralSuiteData form """

        # upload logo_img
        uf = create_dff_image(field_name='suite_logo')

        gsd = GeneralSuiteData.objects.get()
        initial_data = model_to_dict(gsd)

        form_data = copy.copy(initial_data)
        updated_title = 'Updated title'
        form_data.update({
            'title': updated_title
        })

        form = GeneralSuiteDataForm(instance=gsd, initial=initial_data, data=form_data)
        self.assertTrue(form.is_valid())
        form.save()

        gsd.refresh_from_db()
        self.assertEqual(gsd.title, updated_title)
