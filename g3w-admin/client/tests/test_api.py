# coding=utf-8
""""Tests for client module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-06-03'
__copyright__ = 'Copyright 2019, Gis3w'

import os
import json
from rest_framework.test import APITestCase, APIClient
from django.conf import settings
from django.urls import reverse
from django.test import override_settings
from django.contrib.auth.models import User
from qdjango.models import Project
from django.core.cache import caches

# Re-use test data from qdjango module
DATASOURCE_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')

@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
@override_settings(CACHES = {
    'qdjango': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
})
class ClientApiTest(APITestCase):
    """Test client API"""

    # These are stored in core module
    fixtures = [
        "BaseLayer.json",
        "G3WGeneralDataSuite.json",
        "G3WMapControls.json",
        "G3WSpatialRefSys.json",
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    @classmethod
    def setUpClass(cls):
        super(ClientApiTest, cls).setUpClass()
        try:
            cls.user = User.objects.get(username='admin%s' % cls.__class__)
        except:
            cls.user = User.objects.create_superuser(username='admin%s' % cls.__class__, password='admin', email='')

        # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
        # TODO: eventually move to QgsServer
        prj = Project.objects.get(title='Un progetto')
        cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(prj.pk)
        cache = caches['qdjango']
        cache.set(cache_key, open(os.path.join(DATASOURCE_PATH, 'getProjectSettings_gruppo-1_un-progetto.xml')).read())

    @classmethod
    def tearDownClass(cls):
        cls.user.delete()

    def setUp(self):
        self.client = APIClient()

    def tearDown(self):
        self.client.logout()

    def _d(self, d, path=[]):
        for k,v in d.items():
            _path = ( path if path else '') + "[\"%s\"]" % k
            if type(v) == dict:
                self._d(v, _path)
            else:
                if type(v) == list:
                    print("self.assertEqual(resp%s, %s)" % (_path, v))
                else:
                    print("self.assertEqual(resp%s, \"%s\")" % (_path, v))

    def __testApiCall(self, view_name, args):
        """Utility to make test calls"""

         # No auth
        response = self.client.get(reverse(view_name, args=args))
        self.assertEqual(response.status_code, 403)

        # Auth
        self.assertTrue(self.client.login(username=self.user.username, password='admin'))
        response = self.client.get(reverse(view_name, args=args))
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def testGroupConfigApiView(self):
        """Test call to config"""

        response = self.__testApiCall('group-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["vectorurl"], "/vector/api/")
        self.assertEqual(resp["group"]["crs"], 4326)
        self.assertEqual(resp["group"]["proj4"], "+proj=longlat +datum=WGS84 +no_defs ")
        self.assertEqual(resp["group"]["mapcontrols"], [u'zoomtoextent', u'zoom', u'zoombox', u'query', u'querybbox', u'querybypolygon', u'overview', u'scaleline', u'geolocation', u'streetview', u'nominatim', u'addlayers', u'length', u'area', u'mouseposition', u'scale'])
        self.assertEqual(resp["group"]["header_logo_img"], "logo_img/qgis-logo.png")
        self.assertEqual(resp["group"]["name"], "Gruppo 1")
        self.assertIsNone(resp["group"]["header_logo_link"])
        self.assertEqual(resp["group"]["initproject"], "qdjango:1")
        self.assertEqual(resp["group"]["header_terms_of_use_link"], "")
        self.assertTrue(resp["group"]["powered_by"])
        self.assertEqual(resp["group"]["baselayers"], [{u'crs': 3857, u'servertype': u'OSM', u'attribution': u"<a href='https://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>", u'name': u'OpenStreetMap', u'title': u'OSM', u'scalebasedvisibility': False, u'maxscale': 0, u'minscale': 100000000, u'id': 3, u'icon': None}])
        self.assertEqual(resp["group"]["header_terms_of_use_text"], "")
        self.assertEqual(resp["group"]["header_custom_links"], [])
        self.assertEqual(resp["group"]["background_color"], "#ffffff")
        self.assertEqual(resp["group"]["id"], 1)
        self.assertEqual(resp["group"]["projects"], [{u'description': u'<p>progetto 1<br></p>', u'title': u'Un progetto', u'thumbnail': u'/static/client/images/FakeProjectThumb.png', u'gid': u'qdjango:1', u'type': u'qdjango', u'id': 1}])
        self.assertIsNone(resp["group"]["overviewproject"])
        self.assertIsNone(resp["main_map_title"])
        self.assertEqual(resp["mediaurl"], "/media/")
        self.assertEqual(resp["baseurl"], "/")
        self.assertEqual(resp["credits"], "/it/credits/")
        self.assertEqual(resp["client"], "client/")
        self.assertEqual(resp["staticurl"], "/static/")
        self.assertEqual(resp["user"]["username"], "admin<type 'type'>")
        self.assertEqual(resp["user"]["first_name"], "")
        self.assertEqual(resp["user"]["last_name"], "")
        self.assertEqual(resp["user"]["admin_url"], "/it/")
        self.assertEqual(resp["user"]["logout_url"], "/it/logout/?next=/it/map/gruppo-1/qdjango/1/")
        self.assertEqual(resp["user"]["groups"], [])
        self.assertEqual(resp["user"]["i18n"], "it")
        self.assertEqual(resp["g3wsuite_logo_img"], "g3wsuite_logo_h40.png")


    def testClientConfigApiView(self):
        """Test call to project config"""

        response = self.__testApiCall('group-project-map-config', ['gruppo-1', 'qdjango', '1'])
        resp = json.loads(response.content)
        self.assertEqual(resp["layerstree"], [])
        self.assertEqual(resp["layers"], [])
        self.assertEqual(resp["search"], [])
        self.assertFalse(resp["wms_use_layer_ids"],)
        self.assertEqual(resp["qgis_version"], "2.18.16")
        self.assertEqual(resp["no_legend"], [])
        self.assertEqual(resp["feature_count"], 5)
        self.assertEqual(resp["widget"], [])
        self.assertEqual(resp["relations"], [])
        self.assertEqual(resp["id"], 1)
        self.assertEqual(resp["initextent"], [-189.0, -130.14542038524587, 189.0, 123.92015338524588])
        self.assertEqual(resp["extent"], [-189.0, -130.14542038524587, 189.0, 123.92015338524588])
        self.assertEqual(resp["ows_method"], "GET")
        self.assertEqual(resp["print"], [])
        self.assertEqual(resp["querymultilayers"], [])
        self.assertEqual(resp["initbaselayer"], 3)
        self.assertEqual(resp["metadata"]["accessconstraints"], "copyright")
        self.assertEqual(resp["metadata"]["name"], "WMS")
        self.assertEqual(resp["metadata"]["title"], "Yet another WMS serving anything")
        self.assertEqual(resp["metadata"]["abstract"], "Lorem ipsum sit amet")
        self.assertEqual(resp["metadata"]["contactinformation"]["contactelectronicmailaddress"], "mail@email.com")
        self.assertEqual(resp["metadata"]["contactinformation"]["contactvoicetelephone"], "1234578")
        self.assertEqual(resp["metadata"]["wms_url"], "")
        self.assertEqual(resp["metadata"]["fees"], "no conditions apply")
        self.assertEqual(resp["metadata"]["keywords"], [u'infoMapAccessService', u'keyword1', u'keyword2'])
        self.assertIsNone(resp["thumbnail"])
        self.assertEqual(resp["name"], "Un progetto")
