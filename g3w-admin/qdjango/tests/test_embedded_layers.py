# coding=utf-8
""""Test embedded layers

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-01-12'
__copyright__ = 'Copyright 2022, Gis3W'

import json
import logging
import os
import shutil
import glob
from unittest import skipIf

from core.models import G3WSpatialRefSys
from core.models import Group as CoreGroup
from django.conf import settings
from django.contrib.auth.models import Group as UserGroup
from django.contrib.auth.models import User
from django.core.files.uploadedfile import TemporaryUploadedFile
from django.test import Client, override_settings
from django.urls import reverse
from guardian.shortcuts import assign_perm, get_anonymous_user
from lxml import etree as et
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.forms import QdjangoProjectForm
from qdjango.models import Layer, Project
from qgis.PyQt.QtCore import QTemporaryDir
from .base import CURRENT_PATH, TEST_BASE_PATH, QdjangoTestBase

logger = logging.getLogger(__name__)

# Run the whole test in a temp MEDIA_ROOT and DATASOURCE_PATH to make sure
# paths are rewritten correctly and without interferences with the existing
# data

TEMP_DIR = QTemporaryDir()
TEMP_PATH = TEMP_DIR.path()
# Directories are separate
DATASOURCE_PATH = os.path.join(TEMP_PATH, 'project_data')
MEDIA_ROOT = os.path.join(TEMP_PATH, 'media_root')
FILE_UPLOAD_TEMP_DIR = os.path.join(TEMP_PATH, 'temp_uploads')
os.mkdir(DATASOURCE_PATH)
os.mkdir(MEDIA_ROOT)
os.mkdir(FILE_UPLOAD_TEMP_DIR)

# Copy all required data
for file in glob.glob(os.path.join(CURRENT_PATH + TEST_BASE_PATH, 'geodata') + '/*.*'):
    shutil.copy(file, DATASOURCE_PATH)


@override_settings(
    DATASOURCE_PATH=DATASOURCE_PATH,
    MEDIA_ROOT=MEDIA_ROOT,
    FILE_UPLOAD_TEMP_DIR=FILE_UPLOAD_TEMP_DIR,
)
class TestEmbeddedLayers(QdjangoTestBase):

    def setUp(cls):

        # main project group
        cls.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        cls.project_group.save()

        cls.project_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded.qgs')
        cls.parent_project_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_parent.qgs')
        cls.parent_project_ddform_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_parent_ddform.qgs')
        cls.project_group_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_group.qgs')
        cls.parent_project_group_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_parent_group.qgs')
        # This one has no embedded layer:
        cls.parent_project_removed_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_parent_removed.qgs')
        # This one has a different title
        cls.parent_project_new_title_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_parent_new_title.qgs')
        # Adds a WMS to the group to test if the embedded gets updated
        cls.parent_project_wms_added = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'embedded_parent_group_wms_added.qgs')

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # Add admin01 to a group
        cls.viewer1_group = cls.main_roles['Viewer Level 1']
        cls.viewer1_group.user_set.add(cls.test_user1)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

        cls.viewer1_group.user_set.remove(cls.test_user1)

    def tearDown(self):
        """Remove all test projects"""

        # for original_name in (
        #     'embedded.qgs',
        #     'embedded_parent.qgs',
        #     'embedded_parent_ddform.qgs',
        #     'embedded_group.qgs',
        #     'embedded_parent_group.qgs',
        #     'embedded_parent_removed.qgs',
        #     'embedded_parent_group_wms_added.qgs',
        #     'embedded_parent_new_title.qgs'):
        #     Project.objects.filter(original_name=original_name).delete()

        super().tearDown()



    def _testApiCallAdmin01(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user, returns the response"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        response = self.client.get(path)
        self.client.logout()
        return response

    def _make_form(self, project_path, instance=None, name=None):
        payload = open(project_path, 'rb').read()
        if name is None:
            name = os.path.basename(project_path)

        qgis_file = TemporaryUploadedFile(name, 'application/xml',
                                          len(payload), 'utf-8')
        qgis_file.file.write(payload)
        qgis_file.file.seek(0)

        form = QdjangoProjectForm(
            data={
                'feature_count_wms': 10,
                'group_slug': self.project_group.slug,
                'toc_tab_default': 'layers',
                'toc_layers_init_status': 'not_collapsed',
                'toc_themes_init_status': 'collapsed',
                'legend_position': 'tab',
                'multilayer_query': 'single',
                'multilayer_querybybbox': 'single',
                'multilayer_querybypolygon': 'single',
                'wms_getmap_format': 'image/png; mode=8bit'
            },
            files={
                'qgis_file': qgis_file
            },
            group=self.project_group,
            request=type('', (object,), {'user': self.test_user1})(),
            instance=instance,
            initial={}
        )

        return form

    def assertSync(self):
        """Go through all projects and layers and check they are in sync"""

        for p in Project.objects.all():
            q_layer_ids = set(l.id() for l in list(p.qgis_project.mapLayers().values()))
            p_layer_ids = set(l.qgs_layer_id for l in p.layer_set.all())
            self.assertEqual(q_layer_ids, p_layer_ids)


    def test_form(self, login=True):
        """Test the form with embedded layers"""

        form = self._make_form(self.project_path)

        self.assertFalse(form.is_valid())
        self.assertIn('project does not exist', form.errors['qgis_file'][0])

        # Load parent layer
        form = self._make_form(self.parent_project_path)

        self.assertTrue(form.is_valid(), form.errors)

        # Save embedded project
        form.qgisProject.save(**form.cleaned_data)

        # Verify
        project = Project.objects.get(original_name='embedded_parent.qgs')
        self.assertIsNotNone(project)

        # Reload embedded, this time it should pass

        form = self._make_form(self.project_path)

        self.assertTrue(form.is_valid())

        # Save the embedded project
        form.qgisProject.save(**form.cleaned_data)

        project = Project.objects.get(original_name='embedded.qgs')
        self.assertIsNotNone(project)

        self.assertEqual(project.layer_set.all().count(), 2)
        self.assertEqual(project.layer_set.filter(parent_project=Project.objects.get(
            original_name='embedded_parent.qgs')).count(), 1)

        # Check the embedded layer
        embedded_layer = project.layer_set.get(parent_project=Project.objects.get(
            original_name='embedded_parent.qgs'))
        parent_layer = Layer.objects.get(
            qgs_layer_id=embedded_layer.qgs_layer_id, project__original_name='embedded_parent.qgs')

        for attr in ('name', 'datasource', 'qgs_layer_id', 'geometrytype', 'layer_type', 'origname', 'srid'):
            self.assertEqual(getattr(embedded_layer, attr),
                             getattr(parent_layer, attr))

        # Check that the project embedded layer points to the renamed parent file path
        tree = et.parse(project.qgis_file.path)
        embedded_attributes = tree.xpath('//maplayer[@embedded=1]')[0].attrib
        parent_project = Project.objects.get(
            original_name='embedded_parent.qgs')
        self.assertEqual(
            embedded_attributes['id'], embedded_layer.qgs_layer_id)
        self.assertEqual(embedded_attributes['id'], parent_layer.qgs_layer_id)
        self.assertEqual(embedded_attributes['embedded'], '1')
        self.assertEqual(
            embedded_attributes['project'], parent_project.qgis_file.file.name)

        # Check if removing the parent layer is permitted
        # Use case 1: the user uploads a new version of the parent project without the embedded layer
        # Load parent layer

        form = self._make_form(self.parent_project_removed_path, Project.objects.get(
            original_name='embedded_parent.qgs'))

        # Note: this is now allowed!
        #self.assertFalse(form.is_valid())
        #self.assertIn('is embedded by the project',
        #              form.errors['qgis_file'][0])

        # Use case 2: the project tile or group changes and so changes the QGS file path:
        # the embedded layers project must be updated accordingly

        form = self._make_form(self.parent_project_new_title_path, Project.objects.get(
            original_name='embedded_parent.qgs'), 'embedded_parent.qgs')

        self.assertTrue(form.is_valid())

        # Save the embedded project
        form.qgisProject.save(**form.cleaned_data)

        parent_project = Project.objects.get(
            original_name='embedded_parent.qgs')
        self.assertEqual(parent_project.title, 'parent_new_title')

        # Check that the project embedded layer points to the renamed parent file path
        project = Project.objects.get(original_name='embedded.qgs')
        self.assertEqual(project.title, 'embedded.qgs')
        tree = et.parse(project.qgis_file.path)
        embedded_attributes = tree.xpath('//maplayer[@embedded=1]')[0].attrib
        self.assertEqual(
            embedded_attributes['id'], embedded_layer.qgs_layer_id)
        self.assertEqual(embedded_attributes['id'], parent_layer.qgs_layer_id)
        self.assertEqual(embedded_attributes['embedded'], '1')
        self.assertEqual(
            embedded_attributes['project'], parent_project.qgis_file.file.name)

        self.assertTrue(project.qgis_project.mapLayer(
            'countries_9108e75d_3238_4293_bc56_6847d9ae4927').isValid())

        # Check form configuration for both parent and embedded
        parent_project = Project.objects.get(
            original_name='embedded_parent.qgs')
        self.assertEqual(parent_project.layer_set.filter(name='countries')[0].editor_form_structure, "{'default': None}")
        project = Project.objects.get(original_name='embedded.qgs')
        self.assertEqual(project.layer_set.filter(name='countries')[0].editor_form_structure,
                         "{'default': None}")

        # Update parent with DD form configuration and test both
        form = self._make_form(self.parent_project_ddform_path, parent_project, 'embedded_parent_ddform.qgs')
        form.qgisProject.save(**form.cleaned_data)

        # Check form configuration for both parent and embedded
        parent_project = Project.objects.get(
            original_name='embedded_parent_ddform.qgs')
        countries = parent_project.layer_set.all()[0]
        structure = countries.get_editor_form_structure()
        self.assertEqual(set([f['field_name'] for f in structure]), {'ISOCODE', 'NAME_LOCAL'})

        # Now from embedded:
        project = Project.objects.get(original_name='embedded.qgs')
        countries = project.layer_set.filter(name='countries')[0]
        self.assertIsNotNone(countries.editor_form_structure)
        structure = countries.get_editor_form_structure()
        self.assertEqual(set([f['field_name'] for f in structure]), {'ISOCODE', 'NAME_LOCAL'})

        # Test delete parent also deletes embedded layer
        # This is at the model level: check must also be enforced at the view level

        parent_project.delete()
        project = Project.objects.get(original_name='embedded.qgs')

        # Check that embedded layer is gone
        self.assertEqual(project.layer_set.filter(
            qgs_layer_id='countries_9108e75d_3238_4293_bc56_6847d9ae4927').count(), 0)
        tree = et.parse(project.qgis_file.path)
        self.assertEqual(len(tree.xpath('//maplayer[@embedded=1]')), 0)

    def test_embedded_group(self):

        # Load parent layer
        form = self._make_form(self.parent_project_group_path)

        self.assertTrue(form.is_valid(), form.errors)

        # Save embedded project
        form.qgisProject.save(**form.cleaned_data)

        # Store temporary file to avoid error on test exit (because the temp file was moved)
        #open(form.qgisProject.qgisProjectFile.file.name, 'a').close()

        # Verify
        project = Project.objects.get(
            original_name='embedded_parent_group.qgs')
        self.assertIsNotNone(project)

        self.assertSync()

        # Reload embedded, this time it should pass

        form = self._make_form(self.project_group_path)

        self.assertTrue(form.is_valid())

        # Save the embedded project
        form.qgisProject.save(**form.cleaned_data)
        project = Project.objects.get(original_name='embedded_group.qgs')
        self.assertIsNotNone(project)

        self.assertSync()

        self.assertEqual(project.layer_set.all().count(), 4)
        self.assertEqual(project.layer_set.filter(parent_project=Project.objects.get(
            original_name='embedded_parent_group.qgs')).count(), 3)

        # Test API call for embedded groups
        response = self._testApiCallAdmin01(
            'group-project-map-config', ['gruppo-1', 'qdjango', project.pk])
        resp = json.loads(response.content)
        layer_ids = [l['id'] for l in resp['layers']]
        self.assertEqual(len(layer_ids), 4)

        # Test updating the parent with the same project
        parent_project=Project.objects.get(original_name='embedded_parent_group.qgs')
        form = self._make_form(self.parent_project_group_path, parent_project, 'embedded_parent_group.qgs')
        form.qgisProject.save(instance=parent_project, **form.cleaned_data)

        parent_project=Project.objects.get(original_name='embedded_parent_group.qgs')
        self.assertEqual(parent_project.layer_set.count(), 3)
        project = Project.objects.get(original_name='embedded_group.qgs')
        self.assertEqual(project.layer_set.count(), 4)

        self.assertSync()

        # Test updating the parent with a new WMS layer in a group also updates the embedded
        # Note: the name of the uploaded file must not change
        parent_project=Project.objects.get(original_name='embedded_parent_group.qgs')
        form = self._make_form(self.parent_project_wms_added, parent_project, 'embedded_parent_group.qgs')
        form.qgisProject.save(instance=parent_project, **form.cleaned_data)

        parent_project=Project.objects.get(original_name='embedded_parent_group.qgs')
        self.assertEqual(parent_project.layer_set.count(), 4)
        project = Project.objects.get(original_name='embedded_group.qgs')
        self.assertEqual(project.layer_set.count(), 5)

        self.assertSync()

        # Revert
        parent_project=Project.objects.get(original_name='embedded_parent_group.qgs')
        form = self._make_form(self.parent_project_group_path, parent_project, 'embedded_parent_group.qgs')
        form.qgisProject.save(instance=parent_project, **form.cleaned_data)

        self.assertEqual(parent_project.layer_set.count(), 3)
        project = Project.objects.get(original_name='embedded_group.qgs')
        self.assertEqual(project.layer_set.count(), 4)

        self.assertSync()
