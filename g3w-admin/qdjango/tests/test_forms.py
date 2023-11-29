# coding=utf-8
"""
   Qdjango form testing module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qdjango.forms import QdjangoProjectForm
from django.test.client import RequestFactory
from django.contrib.auth.models import User, Group as AuthGroup
from guardian.shortcuts import assign_perm, remove_perm
from qdjango.models import Project
from core.tests.utils import create_dff_image
from core.models import MapControl, ProjectMapUrlAlias
from core.forms import GroupForm
from .base import QdjangoTestBase, G3W_VIEWER1
from .utils import create_dff_project, create_dff_project_qgz
from editing.models import EDITING_ATOMIC_PERMISSIONS
from copy import copy


class QdjangoFormsTest(QdjangoTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.request = RequestFactory()
        cls.map_controls = MapControl.objects.all()

    def test_qdjango_project_form(self):
        """
        Test qdjango project form, particular attention to ACL
        :return: None
        """

        # set user as admin01
        self.request.user = self.test_user1

        # empty form
        form = QdjangoProjectForm(request=self.request, group=self.project_group)
        self.assertFalse(form.is_valid())

        # upload qgis_file
        uf = create_dff_project('qgis_file')

        # Test Create
        # =========================================

        form_data = {
            'form_id': uf.form_id,
            'feature_count_wms': 10,
            'multilayer_query': 'single',
            'multilayer_querybybbox': 'single',
            'multilayer_querybypolygon': 'single',
            'toc_tab_default': 'layers',
            'toc_layers_init_status': 'not_collapsed',
            'toc_themes_init_status': 'collapsed',
            'legend_position': 'tab',
            'url_alias': 'test_url_alias_name',
            'wms_getmap_format': 'image/png; mode=8bit'
        }

        form = QdjangoProjectForm(request=self.request, group=self.project_group, data=form_data)
        self.assertTrue(form.is_valid())

        # check ACL users and group users
        # Check possible choices values
        # No editor1
        self.assertEqual(len(form.fields['editor_user'].queryset), 0)

        # No editor2
        self.assertEqual(len(form.fields['editor2_user'].queryset), 0)

        # only anonymous
        self.assertEqual(len(form.fields['viewer_users'].queryset), 1)
        self.assertEqual(form.fields['viewer_users'].queryset[0], self.anonymoususer)

        # No Editors group
        self.assertEqual(len(form.fields['editor_user_groups'].queryset), 0)

        # No Viewer group
        self.assertEqual(len(form.fields['viewer_user_groups'].queryset), 0)

        self.assertEqual(len(Project.objects.all()), 2)

        # Toc_tab_default by base layers saved into parent group
        self.assertEqual(len(form.fields['toc_tab_default'].choices), 2)

        # Save project as into project CRUD views
        form.qgisProject.save(**form.cleaned_data)
        if not form.instance.pk:
            form.instance = form.qgisProject.instance
        form.save()

        self.assertEqual(len(Project.objects.all()), 3)

        # check for ProjectMapUrlAlias instance
        url_aliases = ProjectMapUrlAlias.objects.all()
        self.assertEqual(len(url_aliases), 1)
        self.assertEqual(url_aliases[0].alias, 'test_url_alias_name')


        # CHECK ACL users and Group users by map group
        # =================================================
        assign_perm('core.change_group', self.test_editor1, self.project_group)
        assign_perm('core.add_project_to_group', self.test_editor2, self.project_group)
        assign_perm('core.view_group', self.test_viewer1_2, self.project_group)
        assign_perm('core.view_group', self.test_gu_viewer1, self.project_group)
        assign_perm('core.view_group', self.test_gu_viewer2, self.project_group)
        assign_perm('core.view_group', self.test_gu_editor1, self.project_group)
        assign_perm('core.add_project_to_group', self.test_gu_editor1, self.project_group)

        # Add ACL user and groups to form_data
        form_data.update({
            'editor_user': self.test_editor1.pk,
            'editor2_user': self.test_editor2.pk,
            'viewer_users': [self.test_viewer1_2.pk, self.anonymoususer.pk],
            'editor_user_groups': [self.test_gu_editor1.pk],
            'viewer_user_groups': [self.test_gu_viewer1.pk]
        })

        # Update for check permission saved
        form = QdjangoProjectForm(request=self.request, group=self.project_group, data=form_data, instance=form.instance,
                                 initial={})
        self.assertTrue(form.is_valid())

        # check ACL users and group users
        # Check possible choices values
        # editor1
        self.assertEqual(len(form.fields['editor_user'].queryset), 1)
        self.assertEqual(form.fields['editor_user'].queryset[0], self.test_editor1)

        # editor2
        self.assertEqual(len(form.fields['editor2_user'].queryset), 1)
        self.assertEqual(form.fields['editor2_user'].queryset[0], self.test_editor2)

        # Viewer group GU-VIEWER1 GU-VIEWER2
        self.assertEqual(len(form.fields['viewer_user_groups'].queryset), 2)

        # Editor group GU-EDITOR1
        self.assertEqual(len(form.fields['editor_user_groups'].queryset), 1)

        # Save project as into project CRUD views
        form.qgisProject.save(**form.cleaned_data)
        if not form.instance.pk:
            form.instance = form.qgisProject.instance
        form.save()

        # Check ACL after save
        p = Project.objects.get(pk=form.instance.pk)

        self.assertTrue(self.test_editor1.has_perm('qdjango.change_project', p))
        self.assertFalse(self.test_editor1_2.has_perm('qdjango.change_project', p))
        self.assertTrue(self.test_editor2.has_perm('qdjango.change_project', p))
        self.assertTrue(self.test_viewer1.has_perm('qdjango.view_project', p))
        self.assertTrue(self.anonymoususer.has_perm('qdjango.view_project', p))
        self.assertFalse(self.test_viewer1_3.has_perm('qdjango.view_project', p))

        # by viewer groups
        self.assertTrue(self.test_viewer1_2.has_perm('qdjango.view_project', p))

        # by editor groups
        self.assertTrue(self.test_editor2_3.has_perm('qdjango.change_project', p))

        # CHECK EDITING ATOMIC PERMISSIONS
        # For editor
        # --------------------------------

        for l in p.layer_set.all():
            for perm in EDITING_ATOMIC_PERMISSIONS:
                self.assertTrue(self.test_editor1.has_perm(f'qdjango.{perm}', l))
                self.assertTrue(self.test_editor2_3.has_perm(f'qdjango.{perm}', l))

        # CHECK GROUP PROPAGATION OPTIONS
        # only new viewers and new viwer users group
        # ===========================================

        # upload header_logo_image
        uf = create_dff_image(field_name='header_logo_img')

        # Update self.project_group
        # ------------------------------

        form_data = {
            'title': self.project_group.title,
            'name': self.project_group.name,
            'description': self.project_group.description,
            'srid': self.project_group.srid_id,
            'form_id': uf.form_id,
            'lang': 'it',
            'mapcontrols': [mp.pk for mp in self.map_controls]
        }

        initial_form_data = copy(form_data)

        initial_form_data.update({
            'editor_user': self.test_editor1.pk,
            'editor2_user': self.test_editor2.pk,
            'viewer_users': [self.test_viewer1_2.pk],
            'editor_user_groups': [self.test_gu_editor1.pk],
            'viewer_user_groups': [self.test_gu_viewer1.pk, self.test_gu_viewer2.pk]
        })

        # create a ne user
        new_viewer = User.objects.create_user(username='new_user', password='new_user')
        new_viewer.groups.add(AuthGroup.objects.get(name=G3W_VIEWER1))

        # Test ACL
        form_data.update({
            'editor_user': self.test_editor1_2.pk,
            'editor2_user': self.test_editor2_3.pk,
            'viewer_users': [self.test_viewer1.pk, self.test_viewer1_2.pk, new_viewer.pk],
            'editor_user_groups': [self.test_gu_editor1.pk, self.test_gu_editor2.pk],
            'viewer_user_groups': [self.test_gu_viewer1.pk, self.test_gu_viewer2.pk]
        })

        form = GroupForm(request=self.request, data=form_data, instance=self.project_group, initial=initial_form_data)
        print (form.errors)
        self.assertTrue(form.is_valid())
        form.save()

        p.refresh_from_db()

        self.assertFalse(self.test_editor1.has_perm('qdjango.change_project', p))
        self.assertTrue(self.test_editor1_2.has_perm('qdjango.change_project', p))
        self.assertTrue(self.test_editor2.has_perm('qdjango.change_project', p))
        self.assertTrue(self.test_editor2_3.has_perm('qdjango.change_project', p))
        self.assertTrue(self.test_viewer1.has_perm('qdjango.view_project', p))
        self.assertTrue(self.test_viewer1_2.has_perm('qdjango.view_project', p))
        self.assertFalse(new_viewer.has_perm('qdjango.view_project', p))
        self.assertTrue(self.anonymoususer.has_perm('qdjango.view_project', p))
        self.assertFalse(self.test_viewer1_3.has_perm('qdjango.view_project', p))

        # TEST PROPAGATE PERMISSION FROM GROUP TO PROJECT
        # New Viewer and Viewer groups
        # ================================================

        # Reset permission on group for test propagation
        remove_perm('core.view_group', self.test_gu_viewer2, self.project_group)

        # add propagation
        form_data.update({
            'propagate_viewers': 1
        })

        # Run again form
        form = GroupForm(request=self.request, data=form_data, instance=self.project_group, initial=initial_form_data)
        self.assertTrue(form.is_valid())
        form.save()

        self.assertTrue(new_viewer.has_perm('qdjango.view_project', p))


        # TEST UPLOAD QGZ PROJECT FILE
        # =================================================

        # upload qgis_file
        uf = create_dff_project_qgz('qgis_file')

        # Test Create
        # =========================================

        form_data = {
            'form_id': uf.form_id,
            'feature_count_wms': 10,
            'multilayer_query': 'single',
            'multilayer_querybybbox': 'single',
            'multilayer_querybypolygon': 'single',
            'toc_tab_default': 'layers',
            'toc_layers_init_status': 'not_collapsed',
            'toc_themes_init_status': 'collapsed',
            'legend_position': 'tab',
            'url_alias': 'test_url_alias_name_qgz',
            'wms_getmap_format': 'image/png; mode=8bit'
        }

        form = QdjangoProjectForm(request=self.request, group=self.project_group, data=form_data)
        self.assertTrue(form.is_valid())

