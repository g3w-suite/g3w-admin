# coding=utf-8
""""Tests for client module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-06-03'
__copyright__ = 'Copyright 2019, Gis3w'

import os
import json
from django.conf import settings
from django.urls import reverse
from django.test import override_settings
from django.core.files import File
from django.core.cache import cache
from guardian.shortcuts import remove_perm, assign_perm, get_anonymous_user
from qdjango.models import Project
from qdjango.utils.data import QgisProject
from core.tests.base import CoreTestBase
from core.models import MacroGroup, Group, G3WSpatialRefSys
from core.utils.structure import FIELD_TYPES_MAPPING
from qdjango.models import Widget, WIDGET_TYPES
from qgis.core import QgsCoordinateReferenceSystem, QgsCoordinateTransformContext

import logging

logger = logging.getLogger('g3wadmin.debug')

# Re-use test data from qdjango module
PROJECTS_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')
DATASOURCE_PATH = f'{PROJECTS_PATH}/geodata'
QGS310_FILE = 'g3wsuite_project_test_qgis310.qgs'
QGS310_FILE_1A = 'g3wsuite_project_test_qgis310_2.qgs'
QGS310_FILE_1 = 'edit-widget_g3w-suite-project-test.qgs'
QGS310_FILE_2 = 'init_extent_max_extent test_qgis310.qgs'
QGS310_FILE_3 = 'gruppo-1_custom_layer_order_qgis316.qgs'
QGS310_FILE_4 = 'gruppo-1_empty_vector_layer316.qgs'

@override_settings(MEDIA_ROOT=PROJECTS_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
@override_settings(CLIENT_OWS_METHOD='GET')
@override_settings(G3W_CLIENT_SEARCH_ENDPOINT='ows') # deprecated since 3.8, until permanent removal will be forced to 'api'
class ClientApiTest(CoreTestBase):
    """Test client API"""

    # These are stored in core module
    fixtures = CoreTestBase.fixtures + [
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    @classmethod
    def setUpClass(cls):
        super(ClientApiTest, cls).setUpClass()

        # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
        # TODO: eventually move to QgsServer
        cls.prj_test = Project.objects.get(title='Un progetto')

        # new properties has to save before caching, signal on svaing project invalidate cache['django']

        cls.prj_test.thumbnail = '/fake/project.png'
        cls.prj_test.save()

        # create a group print for follow project
        cls.print_group = Group(
            name='Print Group', title='Print Group', header_logo_img='', srid=cls.prj_test.group.srid)
        cls.print_group.save()

        qgis_project_file_print = File(open('{}/{}'.format(PROJECTS_PATH, QGS310_FILE), 'r'))
        cls.project_print310 = QgisProject(qgis_project_file_print)
        cls.project_print310.group = cls.print_group
        cls.project_print310.save()

        qgis_project_file_print_1a = File(open('{}/{}'.format(PROJECTS_PATH, QGS310_FILE_1A), 'r'))
        cls.project_print310_1a = QgisProject(qgis_project_file_print_1a)
        cls.project_print310_1a.group = cls.print_group
        cls.project_print310_1a.save()

        cache_key = f"{settings.QDJANGO_PRJ_CACHE_KEY}_capabilities_{cls.prj_test.pk}"
        cache.set(cache_key, open(os.path.join(PROJECTS_PATH, 'getProjectSettings_gruppo-1_un-progetto_qgis310.xml'),
                                  'rb').read())

        cache_key = f"{settings.QDJANGO_PRJ_CACHE_KEY}_capabilities_{cls.project_print310.instance.pk}"
        cache.set(cache_key, open(os.path.join(PROJECTS_PATH, 'getProjectSettings_g3wsuite_project_test_qgis310.xml'),
                                  'rb').read())

        qgis_project_file_1 = File(open('{}/{}'.format(PROJECTS_PATH, QGS310_FILE_1), 'r'))
        cls.project_print310_1 = QgisProject(qgis_project_file_1)
        cls.project_print310_1.group = cls.print_group
        cls.project_print310_1.save()
        qgis_project_file_1.close()

        cls.extent_group = Group(
            name='Extent Group', title='Extent Group', header_logo_img='', srid=G3WSpatialRefSys.objects.get(srid=32633))
        cls.extent_group.save()
        qgis_project_file_2 = File(open('{}/{}'.format(PROJECTS_PATH, QGS310_FILE_2), 'r'))
        cls.project_extent310_2 = QgisProject(qgis_project_file_2)
        cls.project_extent310_2.group = cls.extent_group
        cls.project_extent310_2.save()
        qgis_project_file_2.close()

        cls.custom_order_layer_group = Group(
            name='Custom Order Layer Group', title='Custom Order Layer Group', header_logo_img='',
            srid=G3WSpatialRefSys.objects.get(srid=4326))
        cls.custom_order_layer_group.save()
        qgis_project_file_3 = File(open('{}/{}'.format(PROJECTS_PATH, QGS310_FILE_3), 'r'))
        cls.project_extent316_1 = QgisProject(qgis_project_file_3)
        cls.project_extent316_1.group = cls.custom_order_layer_group
        cls.project_extent316_1.save()
        qgis_project_file_3.close()

        cls.empty_vector_layer_layer_group = Group(
            name='Empty vector layer Layer Group', title='Empty vector layer Layer Group', header_logo_img='',
            srid=G3WSpatialRefSys.objects.get(srid=4326))
        cls.empty_vector_layer_layer_group.save()
        qgis_project_file_4 = File(open('{}/{}'.format(PROJECTS_PATH, QGS310_FILE_4), 'r'))
        cls.project_extent316_2 = QgisProject(qgis_project_file_4)
        cls.project_extent316_2.group = cls.empty_vector_layer_layer_group
        cls.project_extent316_2.save()
        qgis_project_file_4.close()

    @override_settings(VENDOR_KEYS={'google': '123456789'})
    def testGroupConfigApiView(self):
        """Test call to config"""

        response = self._testApiCall('group-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["vectorurl"], "/vector/api/")
        self.assertEqual(resp["crs"], {
            'epsg': 4326,
            'proj4': '+proj=longlat +datum=WGS84 +no_defs',
            'geographic': True,
            'axisinverted': True,
            'extent': [-180.0, -90.0, 180.0, 90.0]
        })
        print(resp["mapcontrols"])
        self.assertEqual(resp["mapcontrols"], {'zoom': {}, 'zoombox': {}, 'zoomtoextent': {}, 'query': {}, 'querybbox': {}, 'querybypolygon': {}, 'overview': {}, 'scaleline': {}, 'geolocation': {}, 'streetview': {}, 'geocoding': {'providers': {}}, 'addlayers': {}, 'length': {}, 'area': {}, 'mouseposition': {}, 'scale': {}})
        self.assertEqual(resp["header_logo_img"], "logo_img/qgis-logo.png")
        self.assertEqual(resp["name"], "Gruppo 1")
        self.assertIsNone(resp["header_logo_link"])
        self.assertEqual(resp["initproject"], "qdjango:1")
        self.assertEqual(resp["header_terms_of_use_link"], "")
        self.assertTrue(resp["powered_by"])
        self.assertEqual(resp["baselayers"], [{'crs': {'epsg': 3857, 'proj4': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs', 'geographic': False, 'axisinverted': False}, 'servertype': 'OSM', 'attribution': "<a href='https://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>", 'name': 'OpenStreetMap', 'title': 'OSM', 'scalebasedvisibility': False, 'maxscale': 0, 'minscale': 100000000, 'id': 3, 'icon': None}])
        self.assertEqual(resp["header_terms_of_use_text"], "")
        self.assertEqual(resp["header_custom_links"], [])
        self.assertEqual(resp["background_color"], "#ffffff")
        self.assertEqual(resp["id"], 1)
        self.assertEqual(resp["slug"], 'gruppo-1')
        self.assertEqual(len(resp["projects"]), 1)

        self.assertIn('vendorkeys', resp)
        self.assertEqual(resp["vendorkeys"], {'google': '123456789'})

        project = resp["projects"][0]
        to_compare = {'description': '<p>progetto 1<br></p>', 'title': 'Un progetto',
          'thumbnail': '/fake/project.png', 'gid': 'qdjango:1', 'type': 'qdjango', 'id': 1}
        for k in list(to_compare.keys()):
            self.assertEqual(project[k], to_compare[k])

        self.assertIsNone(resp["overviewproject"])
        self.assertIsNone(resp["main_map_title"])
        self.assertEqual(resp["mediaurl"], "/media/")
        self.assertFalse(resp["baseurl"].startswith('/'), 'baseurl is not an absolute URI')
        self.assertEqual(resp["vectorurl"], "/vector/api/")
        self.assertEqual(resp["rasterurl"], "/raster/api/")
        self.assertEqual(resp["proxyurl"], reverse('interface-proxy'))
        self.assertEqual(resp["credits"], "/en/credits/")
        self.assertEqual(resp["client"], "client/")
        self.assertEqual(resp["staticurl"], "/static/")
        self.assertEqual(resp["user"]["username"], "admin01")
        self.assertEqual(resp["user"]["first_name"], "")
        self.assertEqual(resp["user"]["last_name"], "")
        self.assertEqual(resp["user"]["admin_url"], "/en/")
        self.assertEqual(resp["user"]["logout_url"], "/en/logout/?next=/en/map/gruppo-1/qdjango/1/")
        self.assertEqual(resp["user"]["login_url"], "/en/login/?next=/en/map/gruppo-1/qdjango/1/")
        self.assertEqual(resp["user"]["groups"], [])
        self.assertEqual(resp["user"]["i18n"], "en")
        self.assertEqual(resp["g3wsuite_logo_img"], "g3wsuite_logo_h40.png")
        self.assertEqual(resp['i18n'], json.loads(json.dumps(settings.LANGUAGES)))

        # Test GroupIsActivePermission
        # ------------------------------------------------------------

        g = Group.objects.get(slug='gruppo-1')
        g.is_active = False
        g.save()

        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        url = reverse('group-map-config', args=['gruppo-1', 'qdjango', '1'])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 403)

        self.client.logout()

        # Restore group
        g.is_active = True
        g.save()


    def testClientConfigApiView(self):
        """Test call to project config"""

        self.prj_test.invalidate_cache()
        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)

        self.assertEqual(resp["layerstree"], [
            {'toc': True, 'visible': True, 'expanded': False, 'name': 'spatialite_points',
             'id': 'spatialite_points20190604101052075'},
            {'toc': True, 'visible': True, 'expanded': False, 'name': 'world', 'id': 'world20181008111156525'},
            {'toc': True, 'visible': True, 'expanded': True, 'name': 'bluemarble', 'id': 'bluemarble20181008111156906'}])
        self.assertEqual(resp["search"], [])
        self.assertFalse(resp["wms_use_layer_ids"])
        self.assertEqual(resp["qgis_version"], "2.18.16")
        self.assertEqual(resp["feature_count"], 5)
        self.assertEqual(resp["widget"], [])
        self.assertEqual(resp["relations"], [])
        self.assertEqual(resp["id"], 1)
        self.assertEqual(resp["initextent"], [-189.0, -130.14542038524587, 189.0, 123.92015338524588])
        self.assertEqual(resp["extent"], [-189.0, -130.14542038524587, 189.0, 123.92015338524588])
        self.assertEqual(resp["ows_method"], "GET")
        self.assertEqual(resp["print"], [])
        self.assertEqual(resp["querymultilayers"], ['query', 'querybbox', 'querybypolygon'])
        self.assertFalse(resp["context_base_legend"])
        self.assertEqual(resp["initbaselayer"], 3)
        self.assertEqual(resp["metadata"]["accessconstraints"], "copyright")
        self.assertEqual(resp["metadata"]["name"], "WMS")
        self.assertEqual(resp["metadata"]["title"], "Yet another WMS serving anything")
        self.assertEqual(resp["metadata"]["abstract"], "Lorem ipsum sit amet")
        self.assertEqual(resp["metadata"]["contactinformation"]["contactelectronicmailaddress"], "mail@email.com")
        self.assertEqual(resp["metadata"]["contactinformation"]["contactvoicetelephone"], "1234578")
        #self.assertEqual(resp["metadata"]["wms_url"], "")
        self.assertEqual(resp["metadata"]["fees"], "no conditions apply")
        self.assertEqual(resp["metadata"]["keywords"], ['keyword1', 'keyword2'])
        self.assertEqual(resp["thumbnail"], '/media/fake/project.png')
        self.assertEqual(resp["name"], "Un progetto")
        self.assertEqual(resp["search_endpoint"], 'api')

        # test for tab_toc_default
        self.assertTrue(resp["toc_tab_default"], 'layers')

        # check for layers and fields
        self.assertEqual(len(resp['layers']), 3)
        for l in resp['layers']:
            if l['id'] == 'world20181008111156525':

                # check fields
                self.assertEqual(len(l['fields']), 5)
                self.assertEqual([
                    {'name': 'NAME', 'type': FIELD_TYPES_MAPPING['QSTRING'], 'label': 'NAME', 'show': True},
                    {'name': 'CAPITAL', 'type': FIELD_TYPES_MAPPING['QSTRING'], 'label': 'CAPITAL', 'show': True},
                    {'name': 'APPROX', 'type': FIELD_TYPES_MAPPING['QLONGLONG'], 'label': 'APPROX', 'show': True},
                    {'name': 'AREA', 'type': FIELD_TYPES_MAPPING['DOUBLE'], 'label': 'AREA', 'show': True},
                    {'name': 'SOURCETHM', 'type': FIELD_TYPES_MAPPING['QSTRING'], 'label': 'SOURCETHM', 'show': True}]
                , l['fields'])

                # capabilities
                self.assertEqual(l['capabilities'], settings.QUERYABLE | settings.FILTRABLE)

                # bbox
                self.assertAlmostEqual(l['bbox']['minx'], -180, 4)
                self.assertAlmostEqual(l['bbox']['miny'], -89.90000000000000568, 4)
                self.assertAlmostEqual(l['bbox']['maxx'], 180, 4)
                self.assertAlmostEqual(l['bbox']['maxy'], 83.67473300000000336, 4)

                # metadata
                metadata_expected = {
                        "title": "world",
                        "attributes": [
                            {
                                "name": "NAME",
                                "typeName": "String",
                                "comment": "",
                                "length": 40,
                                "precision": 0,
                                "type": "QString",
                                "alias": ""
                            },
                            {
                                "name": "CAPITAL",
                                "typeName": "String",
                                "comment": "",
                                "length": 64,
                                "precision": 0,
                                "type": "QString",
                                "alias": ""
                            },
                            {
                                "name": "APPROX",
                                "typeName": "Integer64",
                                "comment": "",
                                "length": 15,
                                "precision": 0,
                                "type": "qlonglong",
                                "alias": ""
                            },
                            {
                                "name": "AREA",
                                "typeName": "Real",
                                "comment": "",
                                "length": 19,
                                "precision": 15,
                                "type": "double",
                                "alias": ""
                            },
                            {
                                "name": "SOURCETHM",
                                "typeName": "String",
                                "comment": "",
                                "length": 16,
                                "precision": 0,
                                "type": "QString",
                                "alias": ""
                            }
                        ],
                        "crs": [

                        ],
                        "dataurl": {

                        },
                        "metadataurl": {

                        },
                        "attribution": {

                        }
                }

                self.assertEqual(l['metadata'], metadata_expected)

                # crs
                self.assertEqual(l['crs'], {
                            'epsg': 4326,
                            'proj4': '+proj=longlat +datum=WGS84 +no_defs',
                            'geographic': True,
                            'axisinverted': True,
                            'extent': [-180.0, -90.0, 180.0, 90.0]
                        })

            if l['id'] == 'spatialite_points20190604101052075':

                # check fields
                self.assertEqual(len(l['fields']), 2)
                self.assertEqual([
                    {'name': 'pkuid', 'type': FIELD_TYPES_MAPPING['QLONGLONG'], 'label': 'pkuid', 'show': True},
                    {'name': 'name', 'type': FIELD_TYPES_MAPPING['QSTRING'], 'label': 'name', 'show': True}]
                , l['fields'])

                # capabilities
                self.assertEqual(l['capabilities'], settings.QUERYABLE | settings.FILTRABLE)

                # bbox
                self.assertAlmostEqual(l['bbox']['minx'], 1.98008936077027897, 4)
                self.assertAlmostEqual(l['bbox']['miny'], 28.77977157557936039, 4)
                self.assertAlmostEqual(l['bbox']['maxx'], 10.68524667507452364, 4)
                self.assertAlmostEqual(l['bbox']['maxy'], 44.35096846172920948, 4)

                # metadata
                metadata_expected = {
                    'title': 'spatialite_points',
                    'attributes': [
                                    {
                                        'name': 'pkuid',
                                        'typeName': 'integer',
                                        'comment': '',
                                        'length': 0,
                                        'precision': 0,
                                        'type': 'qlonglong',
                                        'alias': ''
                                    },
                                    {
                                        'name': 'name',
                                        'typeName': 'text',
                                        'comment': '',
                                        'length': 0,
                                        'precision': 0,
                                        'type': 'QString',
                                        'alias': ''
                                    }
                    ],
                    'crs': [],
                    'dataurl': {},
                    'metadataurl': {},
                    'attribution': {}
                }

                self.assertEqual(l['metadata'], metadata_expected)

                # crs
                self.assertEqual(l['crs'], {
                    'epsg': 4326,
                    'proj4': '+proj=longlat +datum=WGS84 +no_defs',
                    'geographic': True,
                    'axisinverted': True,
                    'extent': [-180.0, -90.0, 180.0, 90.0]
                })

            if l['id'] == 'bluemarble20181008111156906':
                pass
                # capabilities
                # fixeme: ask to elpaso why into test thios raster is sercheable
                #self.assertEqual(l['capabilities'], settings.QUERYABLE)

                # bbox
                self.assertAlmostEqual(l['bbox']['minx'], -180, 4)
                self.assertAlmostEqual(l['bbox']['miny'], -90, 4)
                self.assertAlmostEqual(l['bbox']['maxx'], 180, 4)
                self.assertAlmostEqual(l['bbox']['maxy'], 90, 4)

                # crs
                self.assertEqual(l['crs'], {
                    'epsg': 4326,
                    'proj4': '+proj=longlat +datum=WGS84 +no_defs',
                    'geographic': True,
                    'axisinverted': True,
                    'extent': [-180.0, -90.0, 180.0, 90.0]
                })

        # Check for edit_url and layers_url
        self.assertTrue('edit_url'in resp)
        self.assertEqual(resp['edit_url'], '/en/qdjango/gruppo-1/projects/update/un-progetto/')
        self.assertTrue('layers_url' in resp)
        self.assertEqual(resp['layers_url'], '/en/qdjango/gruppo-1/projects/un-progetto/layers/')

        # Test ProjectPermission
        # ------------------------------------------------------------
        url = reverse('group-project-map-config', args=['gruppo-1', 'qdjango', '1'])

        # Anonymouse user
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 403)

        assign_perm('view_project', get_anonymous_user(), self.prj_test)

        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        self.assertFalse('edit_url' in resp)
        self.assertFalse('layers_url' in resp)

        assign_perm('view_project', self.test_viewer1, self.prj_test)
        self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username)

        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        self.assertFalse('edit_url' in resp)
        self.assertFalse('layers_url' in resp)

        self.client.logout()

        assign_perm('view_project', self.test_editor1, self.prj_test)
        assign_perm('change_project', self.test_editor1, self.prj_test)
        self.client.login(username=self.test_editor1.username, password=self.test_editor1.username)

        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        self.assertFalse('edit_url' in resp)
        self.assertFalse('layers_url' in resp)

        self.client.logout()


        # Test ProjectIsActivePermission
        # ------------------------------------------------------------

        p = Project.objects.get(pk=1)
        p.is_active = False
        p.save()

        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        url = reverse('group-project-map-config', args=['gruppo-1', 'qdjango', '1'])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 403)

        self.client.logout()

        # Restore group
        p.is_active = True
        p.save()


    def test_custom_layer_order(self):
        """Testing qgis custom layer order"""

        response = self._testApiCall('group-project-map-config', ['custom-order-layer-group', 'qdjango',
                                                                  self.project_extent316_1.instance.pk])
        resp = json.loads(response.content)

        self.assertTrue(resp['layers'][0]['id'], 'bluemarble20181008111156906')
        self.assertTrue(resp['layers'][1]['id'], 'world20181008111156525')
        self.assertTrue(resp['layers'][2]['id'], 'spatialite_points20190604101052075')
        self.assertTrue(resp['layers'][3]['id'], 'popolation_femme_2019_4a0ec267_1fc5_466c_be89_1c7525744e11')

    def test_empty_vector_layer(self):
        """Testing remove empty vector layer from config client API"""



        # G3W_CLIENT_NOT_SHOW_EMPTY_VECTORLAYER = False
        # --------------------------------------------
        with self.settings(G3W_CLIENT_NOT_SHOW_EMPTY_VECTORLAYER=False):
            response = self._testApiCall('group-project-map-config', [
                self.project_extent316_2.instance.group.slug,
                'qdjango',
                self.project_extent316_2.instance.pk
            ])
            resp = json.loads(response.content)
            layers = [l['id'] for l in resp['layers']]

            self.assertTrue('empty_table_c24561b9_a94f_4515_ba52_0c12e5608094' in layers)

        # G3W_CLIENT_NOT_SHOW_EMPTY_VECTORLAYER = True
        # --------------------------------------------
        with self.settings(G3W_CLIENT_NOT_SHOW_EMPTY_VECTORLAYER=True):

            self.project_extent316_2.instance.invalidate_cache()
            response = self._testApiCall('group-project-map-config', [
                self.project_extent316_2.instance.group.slug,
                'qdjango',
                self.project_extent316_2.instance.pk
            ])
            resp = json.loads(response.content)
            layers = [l['id'] for l in resp['layers']]

            self.assertFalse('empty_table_c24561b9_a94f_4515_ba52_0c12e5608094' in layers)

    def test_init_max_extent_policy(self):
        """ Test init  and maxextent policy by checked or not of use_map_extent_as_init_extent"""

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)

        self.assertEqual(resp["initextent"], resp["extent"])

        self.prj_test.use_map_extent_as_init_extent = True
        self.prj_test.save()

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)

        self.assertNotEqual(resp["initextent"], resp["extent"])

        self.prj_test.use_map_extent_as_init_extent = False
        self.prj_test.save()

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)

        self.assertEqual(resp["initextent"], resp["extent"])


    def testClientConfigApiThumbnailView(self):
        """ Test api project config for thumbnail param """

        # Get project instance for invalidate  it
        #prj = Project.objects.get(pk=1)

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["thumbnail"], '/media/fake/project.png')

        # add group to macrogroup
        macrogorup = MacroGroup(name='thgroup_test', title='thgroup_test', logo_img='/fake/macrogroup.png')
        macrogorup.save()
        macrogorup.group_set.add(self.prj_test.group)

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["thumbnail"], '/media/fake/project.png')

        # Check use_logo_client by macrogroup
        macrogorup.use_logo_client = True
        macrogorup.save()

        self.prj_test.invalidate_cache()

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["thumbnail"], '/media/fake/macrogroup.png')

        # Check use_logo_client by group
        self.prj_test.group.use_logo_client = True
        self.prj_test.group.save()

        self.prj_test.invalidate_cache()

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["thumbnail"], self.prj_test.group.header_logo_img.url)

    def testClientConfigApiWidget(self):
        """Test layer widget config section"""

        layer = self.prj_test.layer_set.get(qgs_layer_id='spatialite_points20190604101052075')

        # update datasource to work
        layer.datasource = f"dbname='{DATASOURCE_PATH}/geodata/un-progetto.db' table=\"spatialite_points\" (geom) sql="
        layer.save()

        # create a search widget with selectbox
        # -------------------------------------------
        widget_body = {
            "title": "asert",
            "query": "simpleWmsSearch",
            "usewmsrequest": True,
            "fields": [
                {
                    "name": "name",
                    "label": "name",
                    "blanktext": "",
                    "filterop": "eq",
                    "widgettype": "selectbox",
                    "input": {
                        "type": "textfield",
                        "options": {}
                    },
                    "logicop": 'and'
                }
            ],
            "results":[],
            "selectionlayer": "spatialite_points20190604101052075",
            "selectionzoom": 0,
            "dozoomtoextent": True
        }

        widget = Widget(
            widget_type='search',
            name='Test selectbox',
            datasource=layer.datasource,
            body=json.dumps(widget_body)
        )
        widget.save()
        widget.layers.add(layer)

        self.prj_test.invalidate_cache()

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)

        self.assertTrue(len(resp["search"]) > 0)
        resp_serach = resp['search'][0]
        self.assertEqual(resp_serach['name'], 'Test selectbox')
        self.assertEqual(resp_serach['type'], 'search')
        self.assertEqual(resp_serach['options']['filter'][0]['input']['type'], 'selectfield')
        # removed in v3.8
        # self.assertEqual(resp_serach['options']['filter'][0]['input']['options']['values'], [])
        self.assertEqual(resp_serach['options']['filter'][0]['logicop'], 'AND')

        # create a search widget with autocompletebox
        # -------------------------------------------
        widget_body = {
            "title": "autocomplete test title",
            "query": "simpleWmsSearch",
            "usewmsrequest": True,
            "fields": [
                {
                    "name": "name",
                    "label": "name",
                    "blanktext": "",
                    "filterop": "eq",
                    "widgettype": "autocompletebox",
                    "input": {
                        "type": "textfield",
                        "options": {}
                    },
                    "logicop": 'and'
                }
            ],
            "results": [],
            "selectionlayer": "spatialite_points20190604101052075",
            "selectionzoom": 0,
            "dozoomtoextent": True
        }

        widget = Widget(
            widget_type='search',
            name='Test autocompletebox',
            datasource=layer.datasource,
            body=json.dumps(widget_body)
        )
        widget.save()
        widget.layers.add(layer)

        self.prj_test.invalidate_cache()

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)

        self.assertTrue(len(resp["search"]) == 2)
        resp_serach = resp['search'][1]
        self.assertEqual(resp_serach['name'], 'Test autocompletebox')
        self.assertEqual(resp_serach['type'], 'search')
        self.assertEqual(resp_serach['options']['filter'][0]['input']['type'], 'autocompletefield')
        self.assertEqual(resp_serach['options']['filter'][0]['logicop'], 'AND')

        # create a search widget with selectbox for a field with a ValueMap edit widget
        # -----------------------------------------------------------------------------

        layer = self.project_print310_1.instance.layer_set.get(qgs_layer_id='layer_for_edit_widget_d16f33ed_6014_4dae_b9fe_1aa0381d81c3')

        widget_body = {
            "title": "asert",
            "query": "simpleWmsSearch",
            "usewmsrequest": True,
            "fields": [
                {
                    "name": "t_code_a",
                    "label": "t_code_a",
                    "blanktext": "",
                    "filterop": "eq",
                    "widgettype": "selectbox",
                    "input": {
                        "type": "textfield",
                        "options": {}
                    },
                    "logicop": 'and'
                }
            ],
            "results": [],
            "selectionlayer": "layer_for_edit_widget_d16f33ed_6014_4dae_b9fe_1aa0381d81c3",
            "selectionzoom": 0,
            "dozoomtoextent": True
        }

        widget = Widget(
            widget_type='search',
            name='Test selectbox for field with valuemap',
            datasource=layer.datasource,
            body=json.dumps(widget_body)
        )
        widget.save()
        widget.layers.add(layer)

        response = self._testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', self.project_print310_1.instance.pk])
        resp = json.loads(response.content)

        self.assertTrue(len(resp["search"]) > 0)
        resp_serach = resp['search'][0]
        self.assertEqual(resp_serach['name'], 'Test selectbox for field with valuemap')
        self.assertEqual(resp_serach['type'], 'search')
        self.assertEqual(resp_serach['options']['filter'][0]['input']['type'], 'selectfield')
        # removed in v3.8
        # self.assertEqual(resp_serach['options']['filter'][0]['input']['options']['values'],
        #                  [
        #                      {"value": "1", "key": "LOW"},
        #                      {"value": "2", "key": "MEDIUM"},
        #                      {"value": "3", "key": "HIGHT"}
        #                  ]
        #                  )
        self.assertEqual(resp_serach['options']['filter'][0]['logicop'], 'AND')

    def testClientConfigApiViewForPrint(self):
        """Test client config API for print section"""

        response = self._testApiCall('group-project-map-config',
                                     ['gruppo-1', 'qdjango', self.project_print310.instance.pk])
        resp = json.loads(response.content)

        self.assertEqual(
            resp["print"],
            json.loads('['
                       '{"name": "A4", "w": 297.0, "h": 210.0, "labels": [{"id": "Print", "text": "Print"}], "maps": [{"name": "map0", "displayname": "Map 1", "w": 189.53, "h": 117.75944852941177, "overview": false, "scale": 24651341.004171893, "extent": {"xmin": -33.650906640076606, "ymin": 20.637462798706206, "xmax": 60.849040859923356, "ymax": 79.35250370863265}}]},'
                       '{"name": "atlas_test", "w": 297.0, "h": 210.0, "labels": [],"atlas": {"qgs_layer_id": "countries_simpl20171228095706310", "field_name": "ISOCODE"}, "maps": [{"name": "map0", "displayname": "Map 1", "w": 117.063, "h": 76.29999107142858, "overview": false, "scale": 2621775.4915320138, "extent": {"xmin": 17.62596823561644, "ymin": 39.497494100000004, "xmax": 22.71810776438356, "ymax": 42.8164779}}]}'
                       ']')
        )

    def testClientConfigApiViewForInitMaxExtent(self):
        """Test init max extent for client config api"""

        # check for tab_doc_dafault: set to legend
        self.project_extent310_2.instance.toc_tab_default = 'legend'
        self.project_extent310_2.instance.save()



        response = self._testApiCall('group-project-map-config',
                                     [self.extent_group.slug, 'qdjango', self.project_extent310_2.instance.pk])
        resp = json.loads(response.content)

        self.assertEqual([int(i) for i in resp['extent']],
                         [166021, 0, 534994, 9329005])

        self.assertEqual(resp['toc_tab_default'], 'legend')

    def testClientConfigApiViewForFilterByUser(self):
        """Test Filter by User/Group"""


        path = reverse('group-project-map-config', args=[self.project_print310.group.slug, 'qdjango', self.project_print310.instance.pk])
        res = self.client.get(path)
        self.assertEqual(res.status_code, 403)

        # grant to viewer_1 and
        self.project_print310.instance.addPermissionsToViewers([self.test_viewer1.pk])
        self.project_print310.instance.add_permissions_to_viewer_user_groups([self.test_gu_viewer2.pk])

        # grant to viewer_1 to project 1a with same layer ids
        self.project_print310_1a.instance.addPermissionsToViewers([self.test_viewer1.pk])
        self.project_print310_1a.instance.add_permissions_to_viewer_user_groups([self.test_gu_viewer2.pk])

        self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username)
        res = self.client.get(path)

        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        layers = [l['name'] for l in jres['layers']]

        self.assertTrue("Cities" in layers)
        self.assertTrue("Countries" in layers)
        self.assertTrue("Rivers" in layers)

        layerstree = json.dumps(jres['layerstree'])

        self.assertTrue('"name": "Cities"' in layerstree)
        self.assertTrue('"name": "Countries"' in layerstree)
        self.assertTrue('"name": "Rivers"' in layerstree)

        # Check relations
        self.assertEqual(len(jres['relations']), 1)


        layer_cities = self.project_print310.instance.layer_set.filter(name="Cities")
        layer_countries = self.project_print310.instance.layer_set.filter(name="Countries")

        # remove Cities for viewer_1
        remove_perm('qdjango.view_layer', self.test_viewer1, layer_cities)

        # remove Countries and Cities for group GU-VIEWER2
        remove_perm('qdjango.view_layer', self.test_gu_viewer2, layer_cities)
        remove_perm('qdjango.view_layer', self.test_gu_viewer2, layer_countries)

        self.project_print310.instance.invalidate_cache()

        res = self.client.get(path)

        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        layers = [l['name'] for l in jres['layers']]

        self.assertFalse("Cities" in layers)
        self.assertTrue("Countries" in layers)
        self.assertTrue("Rivers" in layers)

        layerstree = json.dumps(jres['layerstree'])

        self.assertFalse('"name": "Cities"' in layerstree)
        self.assertTrue('"name": "Countries"' in layerstree)
        self.assertTrue('"name": "Rivers"' in layerstree)

        # Check relations
        self.assertEqual(len(jres['relations']), 0)

        self.client.logout()

        # Check vs other project with same layer ids
        path_1a = reverse('group-project-map-config',
                          args=[self.project_print310_1a.group.slug, 'qdjango', self.project_print310_1a.instance.pk])

        self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username)
        res = self.client.get(path_1a)

        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        layers = [l['name'] for l in jres['layers']]

        self.assertTrue("Cities" in layers)
        self.assertTrue("Countries" in layers)
        self.assertTrue("Rivers" in layers)

        layerstree = json.dumps(jres['layerstree'])

        self.assertTrue('"name": "Cities"' in layerstree)
        self.assertTrue('"name": "Countries"' in layerstree)
        self.assertTrue('"name": "Rivers"' in layerstree)

        # Check relations
        self.assertEqual(len(jres['relations']), 1)

        self.client.logout()

        # login as viewer1.3 inside group gu_viewer2
        self.client.login(username=self.test_viewer1_3.username, password=self.test_viewer1_3.username)
        res = self.client.get(path)

        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        layers = [l['name'] for l in jres['layers']]

        self.assertFalse("Cities" in layers)
        self.assertFalse("Countries" in layers)
        self.assertTrue("Rivers" in layers)

        layerstree = json.dumps(jres['layerstree'])

        self.assertFalse('"name": "Cities"' in layerstree)
        self.assertFalse('"name": "Countries"' in layerstree)
        self.assertTrue('"name": "Rivers"' in layerstree)

        # Check relations
        self.assertEqual(len(jres['relations']), 0)

        self.client.logout()

        # Check vs other project with same layer ids for user groups
        self.client.login(username=self.test_viewer1_3.username, password=self.test_viewer1_3.username)
        res = self.client.get(path_1a)

        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        layers = [l['name'] for l in jres['layers']]

        self.assertTrue("Cities" in layers)
        self.assertTrue("Countries" in layers)
        self.assertTrue("Rivers" in layers)

        layerstree = json.dumps(jres['layerstree'])

        self.assertTrue('"name": "Cities"' in layerstree)
        self.assertTrue('"name": "Countries"' in layerstree)
        self.assertTrue('"name": "Rivers"' in layerstree)

        # Check relations
        self.assertEqual(len(jres['relations']), 1)

    def test_client_permalink_code(self):
        """Test permalink code url parameter and change of /api/config result"""

        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)

        url = reverse('group-project-map-config', args=[self.project_print310.instance.group.slug, 'qdjango', self.project_print310.instance.pk])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        jres = res.json()

        logger.debug(jres)

        self.client.logout()

