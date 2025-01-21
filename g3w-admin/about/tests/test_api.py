# coding=utf-8
""" Base testing and testing API for About module
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-09-04'
__copyright__ = 'Copyright 2019, GIS3W'

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse
from django.core.files import File
from django.utils import translation
from guardian.compat import get_user_model
from rest_framework.test import APIClient
from usersmanage.models import User, Group as UserGroup
from core.models import Group as CoreGroup, G3WSpatialRefSys, MacroGroup, GroupProjectPanoramic
from qdjango.utils.data import QgisProject
import os
import json


CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/about/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_DB = 'about_test_project.sqlite'
QGS_FILE = 'about_test_project.qgs'
QGS_FILE_2 = 'about_test_project2.qgs'


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'some',
            }
    },
    DATASOURCE_PATH=DATASOURCE_PATH,
    G3WADMIN_LOCAL_MORE_APPS=[
        'about',
    ])
class AboutTestsBase(TestCase):
    """Base class for About module tests"""

    fixtures = ['BaseLayer.json',
                'G3WMapControls.json',
                'G3WSpatialRefSys.json',
                'G3WGeneralDataSuite.json',
                ]

    def setUp(self):

        translation.activate(settings.LANGUAGE_CODE[:2])

        # Admin level 1
        self.test_user_admin1 = User.objects.create_user(username='admin01', password='admin01')
        self.test_user_admin1.is_superuser = True
        self.test_user_admin1.save()

        # Editor level 1
        self.test_user1 = User.objects.create_user(username='user01', password='user01')
        self.group = UserGroup.objects.get(name='Editor Level 1')
        self.test_user1.groups.add(self.group)
        self.test_user1.save()

        # Editor level 2
        self.test_user2 = User.objects.create_user(username='user02', password='user02')
        self.group = UserGroup.objects.get(name='Editor Level 2')
        self.test_user2.groups.add(self.group)
        self.test_user2.save()

        self.test_user3 = User.objects.create_user(username='user03', password='user03')
        self.group = UserGroup.objects.get(name='Viewer Level 1')
        self.test_user3.groups.add(self.group)
        self.test_user3.save()

        self.test_user4 = User.objects.create_user(username='user04', password='user04')
        self.test_user4.groups.add(self.group)
        self.test_user4.save()

        self.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        self.project_group.save()
        self.project_group.addPermissionsToEditor(self.test_user2)

        self.project_group2 = CoreGroup(name='Group2', title='Group2', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        self.project_group2.save()

        self.project_group3 = CoreGroup(name='Group3', title='Group3', header_logo_img='',
                                       srid=G3WSpatialRefSys.objects.get(auth_srid=3857))

        self.project_group3.save()

        # create macrogroups
        self.macrogroup = MacroGroup(title='Macrogroup1', logo_img='macrogroup.png')
        self.macrogroup.save()
        self.project_group2.macrogroups.add(self.macrogroup)
        self.project_group.macrogroups.add(self.macrogroup)

        # create macrogroups 2
        self.macrogroup2 = MacroGroup(title='Macrogroup2', logo_img='macrogroup2.png')
        self.macrogroup2.save()
        self.project_group.macrogroups.add(self.macrogroup2)

        # add permission to anonymous and viewer
        self.project_group2.addPermissionsToViewers(users_id=[self.test_user3.pk, get_user_model().get_anonymous().pk])

        #projects
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        self.project = QgisProject(qgis_project_file)
        self.project.title = 'A project'
        self.project.group = self.project_group
        self.project.save()

        # projects
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE_2), 'r'))
        self.project2 = QgisProject(qgis_project_file)
        self.project2.group = self.project_group
        self.project2.save()

        # add permission to anonumous and viewer
        self.project.instance.addPermissionsToViewers([self.test_user3.pk])

    @classmethod
    def tearDownClass(cls):
        """Cleanup """
        super(AboutTestsBase, cls).tearDownClass()


class PortalTestAPI(AboutTestsBase):
    """ Main portal test API class"""



    def test_group(self):
        """ Test for group map """

        # instance API client
        client = APIClient()

        # user not logged(anonymoususer)
        url = reverse('about-group-api-list')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)
        self.assertNotIn('edit_url', jcontent[0])

        # user logged as viewer
        self.assertTrue(client.login(username=self.test_user3, password=self.test_user3))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)

        client.logout()

        # user logged as editor_level_2
        self.assertTrue(client.login(username=self.test_user2, password=self.test_user2))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)
        feature = jcontent[0]
        self.assertNotIn('edit_url', feature)

        client.logout()

        # user logged as admin
        self.assertTrue(client.login(username=self.test_user_admin1, password=self.test_user_admin1))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 3)
        feature = jcontent[0]
        self.assertIn('edit_url', feature)
        group = CoreGroup.objects.filter(pk=feature['id'])[0]
        self.assertEqual(feature['edit_url'], reverse('group-update', kwargs={'slug': group.slug}))

        client.logout()

    def test_project(self):
        """ Test api for qdjango projects """

        # instance API client
        client = APIClient()

        # user not logged(anonymoususer)
        url = reverse('about-project-api-list')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 0)

        # user logged as admin
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)

        # check for project data
        result = jcontent[0]
        self.assertEqual(self.project.instance.pk, result['id'])
        self.assertEqual(self.project.instance.title, result['title'])
        map_url = reverse('group-project-map', kwargs={
            'group_slug': self.project.instance.group.slug,
            'project_type': 'qdjango',
            'project_id': self.project.instance.pk
        })
        self.assertEqual(map_url, result['map_url'])
        edit_url = reverse('qdjango-project-update', kwargs={
            'group_slug': self.project.instance.group.slug,
            'slug': self.project.instance.slug
        })
        self.assertEqual(edit_url, result['edit_url'])

        url_by_group = reverse('about-project-by-group-api-list', kwargs={'group_id': self.project_group.pk})
        response = client.get(url_by_group)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)

        url_by_group = reverse('about-project-by-group-api-list', kwargs={'group_id': self.project_group2.pk})
        response = client.get(url_by_group)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 0)

        client.logout()

        # user logged as user2
        self.assertTrue(client.login(username=self.test_user2.username, password=self.test_user2.username))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 0)
        client.logout()

        # ser logged as user3
        self.assertTrue(client.login(username=self.test_user3.username, password=self.test_user3.username))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)
        self.assertNotIn('edit_url', jcontent[0])

    def test_macrogroup(self):
        """ Test for macrogroup """

        # instance API client
        client = APIClient()

        # user not logged(anonymoususer)
        url = reverse('about-macrogroup-api-list')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)
        self.assertNotIn('edit_url', jcontent[0])

        # user logged as admin
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)
        feature = jcontent[0]
        macrogroup = MacroGroup.objects.filter(pk=feature['id'])[0]
        self.assertIn('edit_url', feature)
        edit_url = reverse('macrogroup-update', kwargs={
            'slug': macrogroup.slug
        })
        self.assertEqual(edit_url, feature['edit_url'])

        client.logout()

        # get group by macrogroup id
        # user not logged: Macrogroup1 1 group, Macrogroup2 0 group
        url = reverse('about-group-by-macrogroup-api-list', kwargs={'macrogroup_id': self.macrogroup.pk})
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)
        self.assertEqual(jcontent[0]['id'], self.project_group2.pk)
        self.assertNotIn('edit_url', jcontent[0])

        url = reverse('about-group-by-macrogroup-api-list', kwargs={'macrogroup_id': self.macrogroup2.pk})
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 0)

        # user logged as admin: Macrogroup1 2 group, Macrogroup2 1 group
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))
        url = reverse('about-group-by-macrogroup-api-list', kwargs={'macrogroup_id': self.macrogroup.pk})
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)
        feature = jcontent[0]
        group = CoreGroup.objects.filter(pk=feature['id'])[0]
        edit_url = reverse('group-update', kwargs={
            'slug': group.slug
        })
        self.assertEqual(edit_url, feature['edit_url'])

        url = reverse('about-group-by-macrogroup-api-list', kwargs={'macrogroup_id': self.macrogroup2.pk})
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)

        # check Group without MacroGroup
        url = reverse('about-group-without-macrogroup-api-list')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)

        # ad new group without macrogroup
        new_group = CoreGroup(name='Group33', title='Group33', header_logo_img='',
                  srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        new_group.save()

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)
        self.assertEqual(jcontent[1]['name'], 'Group33')

        client.logout()

    def test_genericsuitedata(self):
        """ Test for Generic suite data """

        # instance API client
        client = APIClient()

        # user not logged(anonymoususer)
        url = reverse('about-infodata-api-list')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        self.assertTrue('title' in jcontent and 'about_name' in jcontent)

    def test_panorami_project_filter(self):
        """Test filter remove panoramic project"""

        # instance API client
        client = APIClient()

        url = reverse('about-project-api-list')

        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)

        # set project as panoramic
        gpp = GroupProjectPanoramic.objects.create(group_id=self.group.pk, project_type='qdjango',
                                             project_id=self.project.instance.pk)

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 1)

        #remove project as panoramic
        gpp.delete()

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent), 2)

        client.logout()



