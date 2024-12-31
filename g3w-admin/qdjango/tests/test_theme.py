# coding=utf-8
""""Test project theme API and Views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-09-15'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.urls import reverse
from django.core.files import File
from django.core.exceptions import ObjectDoesNotExist
from qdjango.models import (
    Project, CustomerTheme
)
from guardian.shortcuts import assign_perm
from .base import \
    QdjangoTestBase, \
    QGS316_THEME_FILE, \
    QGS328_THEME_FILE, \
    QGS322_PRINT_LAYOUT_THEME_FILE, \
    TEST_BASE_PATH, \
    CURRENT_PATH, \
    QgisProject

import json


class QdjangoThemeTest(QdjangoTestBase):
    """ Testing Project theme system """

    def setUp(self):
        super().setUp()

        self.project_theme316 = QgisProject(File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS316_THEME_FILE), 'r')))
        self.project_theme316.title = 'A project with themes QGIS 3.16'
        self.project_theme316.group = self.project_group
        self.project_theme316.save()

        self.project_layout_theme322 = QgisProject(
            File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS322_PRINT_LAYOUT_THEME_FILE), 'r')))
        self.project_layout_theme322.title = 'A project with layout with preset theme QGIS 3.22'
        self.project_layout_theme322.group = self.project_group
        self.project_layout_theme322.save()

        self.project_theme328 = QgisProject(
            File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS328_THEME_FILE), 'r')))
        self.project_theme328.title = 'A project with themes QGIS 3.28'
        self.project_theme328.group = self.project_group
        self.project_theme328.save()

    def _testApiCall(self, view_name, args, kwargs={}, data=None, method='POST', username='admin01', status_code=200):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(username=username, password=username))
        if data:
            if method == 'POST':
                response = self.client.post(path, data=data)
            elif method == 'PUT':
                response = self.client.put(path, data=data, content_type='application/json')
            self.assertTrue(response.status_code in (200, 201))
        else:
            if method == 'DELETE':
                response = self.client.delete(path)
                self.assertEqual(response.status_code, 204)
            else:
                response = self.client.get(path)
                self.assertEqual(response.status_code, status_code)
        self.client.logout()
        return response

    def test_map_config_api(self):
        """Test map config api for themes section"""

        response = self._testApiCall('group-project-map-config',
                                     args=[self.project_group.slug, 'qdjango', self.project_theme316.instance.pk])

        jcontent = json.loads(response.content)

        # check qplotly into plugins section
        self.assertTrue('map_themes' in jcontent)

        # Result to compare
        map_themes ={
            "project": [
                {
                    "theme": "View1",
                    "styles": {
                        "countries_3857_4f885888_b0df_4f87_88ed_17c907315fad": "predefinito",
                        "cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea": "predefinito"
                    }
                },
                {
                    "theme": "View2",
                    "styles": {
                        "countries_3857_4f885888_b0df_4f87_88ed_17c907315fad": "predefinito",
                        "cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea": "style_red_square"
                    }
                },
                {
                    "theme": "View3",
                    "styles": {
                        "countries_3857_4f885888_b0df_4f87_88ed_17c907315fad": "predefinito",
                        "cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea": "style_red_square"
                    }
                }
            ],
            "custom": []
        }

        self.assertEqual(jcontent['map_themes'], map_themes)

    def test_prjtheme_api(self):
        """ Test qdjango prjtheme api """

        # Test project not found
        #response = self._testApiCall('qdjango-prjtheme-api',
        #                             args=[12345, 'Faketheme'])
        #jres = json.loads(response.content)
        #self.assertFalse(jres['result'])
        #self.assertEqual(jres['error'], "Project with id 12345 not found!")

        # Test project without themes
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project.instance.pk, 'Theme1'])
        jres = json.loads(response.content)
        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], f"Themes are not available for project {self.project.instance.title}")

        # Test theme with special characters: :,.,=
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project.instance.pk, 'Tav.01: streets, points'])
        jres = json.loads(response.content)
        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], f"Themes are not available for project {self.project.instance.title}")

        # Test view not into project
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project_theme316.instance.pk, 'Faketheme'])
        jres = json.loads(response.content)
        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], "Theme name 'Faketheme' is not available!")

        # Test response with theme
        # View1
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project_theme316.instance.pk, 'View1'])
        jres = json.loads(response.content)
        self.assertTrue(jres['result'])

        view1 = json.loads('[{"name":"countries_3857","id":"countries_3857_4f885888_b0df_4f87_88ed_17c907315fad","visible":true},{"name":"natural","mutually-exclusive":false,"nodes":[{"name":"rivers_3857","id":"rivers_3857_c2f3813e_18fd_40e3_b970_b8dcdd120794","visible":false}],"checked":true,"expanded":true},{"name":"municipal","mutually-exclusive":false,"nodes":[{"name":"cities10000eu_3857","id":"cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea","visible":true},{"name":"important","mutually-exclusive":false,"nodes":[{"name":"aeroporti_3857","id":"aeroporti_3857_e9d2f842_0851_437e_9dfe_7b30a1bb4160","visible":false}],"checked":false,"expanded":true}],"checked":true,"expanded":true},{"name":"natural","mutually-exclusive":false,"nodes":[],"checked":true,"expanded":true}]')
        self.assertEqual(jres['data'], view1)

        # View2
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project_theme316.instance.pk, 'View2'])
        jres = json.loads(response.content)
        self.assertTrue(jres['result'])

        view2 = json.loads(
            '[{"name":"countries_3857","id":"countries_3857_4f885888_b0df_4f87_88ed_17c907315fad","visible":true},{"name":"natural","mutually-exclusive":false,"nodes":[{"name":"rivers_3857","id":"rivers_3857_c2f3813e_18fd_40e3_b970_b8dcdd120794","visible":false}],"checked":false,"expanded":true},{"name":"municipal","mutually-exclusive":false,"nodes":[{"name":"cities10000eu_3857","id":"cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea","visible":true},{"name":"important","mutually-exclusive":false,"nodes":[{"name":"aeroporti_3857","id":"aeroporti_3857_e9d2f842_0851_437e_9dfe_7b30a1bb4160","visible":false}],"checked":false,"expanded":false}],"checked":true,"expanded":true},{"name":"natural","mutually-exclusive":false,"nodes":[],"checked":false,"expanded":true}]')
        self.assertEqual(jres['data'], view2)

        # View3
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project_theme316.instance.pk, 'View3'])
        jres = json.loads(response.content)
        self.assertTrue(jres['result'])

        view3 = json.loads(
            '[{"name":"countries_3857","id":"countries_3857_4f885888_b0df_4f87_88ed_17c907315fad","visible":true},{"name":"natural","mutually-exclusive":false,"nodes":[{"name":"rivers_3857","id":"rivers_3857_c2f3813e_18fd_40e3_b970_b8dcdd120794","visible":false}],"checked":false,"expanded":false},{"name":"municipal","mutually-exclusive":false,"nodes":[{"name":"cities10000eu_3857","id":"cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea","visible":true},{"name":"important","mutually-exclusive":false,"nodes":[{"name":"aeroporti_3857","id":"aeroporti_3857_e9d2f842_0851_437e_9dfe_7b30a1bb4160","visible":false}],"checked":true,"expanded":true}],"checked":false,"expanded":true},{"name":"natural","mutually-exclusive":false,"nodes":[],"checked":false,"expanded":false}]')
        self.assertEqual(jres['data'], view3)

        # Check permission
        response = self._testApiCall(
            "qdjango-prjtheme-api",
            args=[self.project_theme316.instance.pk, "View3"],
            username="viewer1",
            status_code=403,
        )

        assign_perm('view_project', self.test_viewer1, self.project_theme316.instance)

        response = self._testApiCall(
            "qdjango-prjtheme-api",
            args=[self.project_theme316.instance.pk, "View3"],
            username="viewer1",
            status_code=200
        )

        jres = json.loads(response.content)
        self.assertTrue(jres["result"])
        
        view3 = json.loads(
            '[{"name":"natural","mutually-exclusive":false,"nodes":[],"checked":false,"expanded":false},{"name":"municipal","mutually-exclusive":false,"nodes":[{"name":"important","mutually-exclusive":false,"nodes":[],"checked":true,"expanded":true}],"checked":false,"expanded":true},{"name":"natural","mutually-exclusive":false,"nodes":[],"checked":false,"expanded":false}]'
        )
        self.assertEqual(jres["data"], view3)

        self.assertFalse(self.test_viewer1.has_perm('qdjango.view_layer', self.project_theme316.instance.layer_set.get(qgs_layer_id='countries_3857_4f885888_b0df_4f87_88ed_17c907315fad')))

    def test_prj_theme_crud(self):

        # Test CRUD
        # ==============================================================================

        # Create new one custom theme 
        post_data = {
                "layerstree": 
                    [
                        {
                            "name":"countries_3857",
                            "id":"countries_3857_4f885888_b0df_4f87_88ed_17c907315fad",
                            "visible":True
                        },
                        {
                            "name":"natural",
                            "mutually-exclusive":False,
                            "nodes":[
                                {
                                    "name":"rivers_3857",
                                    "id":"rivers_3857_c2f3813e_18fd_40e3_b970_b8dcdd120794",
                                    "visible":False
                                }
                            ],
                            "checked":False,
                            "expanded":False
                        },
                        {
                            "name":"municipal",
                            "mutually-exclusive":False,
                            "nodes":[
                                {
                                    "name":"cities10000eu_3857",
                                    "id":"cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea",
                                    "visible":True
                                },
                                {
                                    "name":"important",
                                    "mutually-exclusive":False,
                                    "nodes":[
                                    {
                                        "name":"aeroporti_3857",
                                        "id":"aeroporti_3857_e9d2f842_0851_437e_9dfe_7b30a1bb4160",
                                        "visible":False
                                    }
                                    ],
                                    "checked":True,
                                    "expanded":True
                                }
                            ],
                            "checked":False,
                            "expanded":True
                        },
                        {
                            "name":"natural",
                            "mutually-exclusive":False,
                            "nodes":[
                                
                            ],
                            "checked":False,
                            "expanded":False
                        }
                    ],
            
                "styles": {
                    'cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea': 'style_red_square', 
                    'countries_3857_4f885888_b0df_4f87_88ed_17c907315fad': 'predefinito'
                }
            }

        # response = self._testApiCall(
        #     "qdjango-prjtheme-api",
        #     args=[self.project_theme316.instance.pk, "Custom theme 1"],
        #     data=post_data
        # )

        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        response = self.client.post(reverse("qdjango-prjtheme-api", args=[self.project_theme316.instance.pk, "Custom theme 1"]), data=post_data, content_type='application/json')

        jres = json.loads(response.content)
        self.assertEqual(jres["result"], True)

        # Check for theme saved into db
        c_theme = CustomerTheme.objects.get(project=self.project_theme316.instance, user=self.test_admin1, name= "Custom theme 1")

        self.assertEqual(json.loads(c_theme.theme), post_data)

        # Update the custom theme
        # -----------------------

        post_data['styles']['countries_3857_4f885888_b0df_4f87_88ed_17c907315fad'] = 'new_style'

        response = self.client.post(
            reverse("qdjango-prjtheme-api", args=[self.project_theme316.instance.pk, "Custom theme 1"]),
            data=post_data,
            content_type='application/json')

        jres = json.loads(response.content)
        self.assertEqual(jres["result"], True)

        # Check for theme updated into db
        c_theme = CustomerTheme.objects.get(project=self.project_theme316.instance, user=self.test_admin1,
                                            name="Custom theme 1")

        self.assertEqual(c_theme.styles['countries_3857_4f885888_b0df_4f87_88ed_17c907315fad'], 'new_style')
        self.client.logout()

        # Test Initconfig API
        # --------------------

        response = self._testApiCall('group-project-map-config',
                                    args=[self.project_group.slug, 'qdjango', self.project_theme316.instance.pk])

        jcontent = json.loads(response.content)

        self.assertTrue('map_themes' in jcontent)

        self.assertEqual(jcontent['map_themes']['custom'], [{
                'theme': 'Custom theme 1',
                'styles': {
                    'cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea': 'style_red_square',
                    'countries_3857_4f885888_b0df_4f87_88ed_17c907315fad': 'new_style'
                }
        }])

        # Test viewer1
        assign_perm('view_project', self.test_viewer1, self.project_theme316.instance)
        response = self._testApiCall('group-project-map-config', username='viewer1',
                                     args=[self.project_group.slug, 'qdjango', self.project_theme316.instance.pk])

        jcontent = json.loads(response.content)

        self.assertTrue('map_themes' in jcontent)

        self.assertEqual(jcontent['map_themes']['custom'], [])


        # Test prjtheme api
        response = self._testApiCall('qdjango-prjtheme-api',
                                     args=[self.project_theme316.instance.pk, 'Custom theme 1'])
        jres = json.loads(response.content)

        self.assertEqual(jres["data"], post_data['layerstree'])

        # Test viewer1
        response = self._testApiCall('qdjango-prjtheme-api', username='viewer1',
                                     args=[self.project_theme316.instance.pk, 'Custom theme 1'])
        jres = json.loads(response.content)

        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], "Theme name 'Custom theme 1' is not available!")


        # Delete the custom theme
        # -----------------------
        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        response = self.client.delete(
            reverse("qdjango-prjtheme-api", args=[self.project_theme316.instance.pk, "Custom theme 1"]),
            content_type='application/json')

        jres = json.loads(response.content)
        self.assertEqual(jres["result"], True)

        with self.assertRaises(ObjectDoesNotExist):
            CustomerTheme.objects.get(project=self.project_theme316.instance, user=self.test_admin1,
                                      name="Custom theme 1")

        # Validation by Pydantic
        del(post_data['layerstree'][1]['name'])


        response = self.client.post(
            reverse("qdjango-prjtheme-api", args=[self.project_theme316.instance.pk, "Custom theme 1"]),
            data=post_data,
            content_type='application/json')

        jres = json.loads(response.content)
        self.assertEqual(jres["result"], False)

        del(post_data['styles'])

        response = self.client.post(
            reverse("qdjango-prjtheme-api", args=[self.project_theme316.instance.pk, "Custom theme 1"]),
            data=post_data,
            content_type='application/json')

        jres = json.loads(response.content)
        self.assertEqual(jres["result"], False)


        self.client.logout()

    def test_map_config_api_layout_preset_theme(self):
        """ Test client settings for project layer with preset theme """

        response = self._testApiCall('group-project-map-config',
                                     args=[self.project_group.slug, 'qdjango',
                                           self.project_layout_theme322.instance.pk])

        jcontent = json.loads(response.content)

        self.assertTrue('preset_theme' in jcontent['print'][0]['maps'][0])
        self.assertFalse('preset_theme' in jcontent['print'][0]['maps'][1])
        self.assertEqual(jcontent['print'][0]['maps'][0]['preset_theme'], 'reference')

    def test_vector_api_featurecount(self):
        """
        Test for /vector/api/featurecount/
        """

        response = self._testApiCall('core-vector-api',
                                     args=[
                                         'featurecount',
                                         'qdjango',
                                         self.project_theme328.instance.pk,
                                         'countries_3857_4f885888_b0df_4f87_88ed_17c907315fad'
                                     ])

        jcontent = json.loads(response.content)

        self.assertEqual(jcontent, {'result': True, 'data': {'0': 54},
                                    'capabilities': [
                                        'add_feature',
                                        'change_feature',
                                        'delete_feature',
                                        'change_attr_feature']
                                    })

        response = self._testApiCall('core-vector-api',
                                     args=[
                                         'featurecount',
                                         'qdjango',
                                         self.project_theme328.instance.pk,
                                         'cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea'
                                     ], kwargs={'style': 'style_red_square'})

        jcontent = json.loads(response.content)

        self.assertEqual(jcontent, {'result': True, 'data': {'0': 8965},
                                    'capabilities': [
                                        'add_feature',
                                        'change_feature',
                                        'delete_feature',
                                        'change_attr_feature'
                                    ]})

        response = self._testApiCall('core-vector-api',
                                     args=[
                                         'featurecount',
                                         'qdjango',
                                         self.project_theme328.instance.pk,
                                         'cities10000eu_3857_728999c2_0883_4627_8df2_25224f71e3ea'
                                     ], kwargs={'style': 'category_style'})

        jcontent = json.loads(response.content)

        self.assertEqual(jcontent, {'result': True, 'data': {
            '{44302153-ea36-4167-835f-91fb250887f2}': 630,
            '{a9ee0316-8513-48cd-a41a-623594d71129}': 8298,
            '{e217c565-ee1f-4148-8186-bc359b16d68b}': 37
        },
        'capabilities': [
            'add_feature',
            'change_feature',
            'delete_feature',
            'change_attr_feature'
        ]})




