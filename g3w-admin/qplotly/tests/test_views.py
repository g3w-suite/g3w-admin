# coding=utf-8
"""" Qplotly test for views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-03-03'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'


from django.urls import reverse
from django.test import override_settings
from django.test.client import Client
from qdjango.tests.base import QdjangoTestBase, CoreGroup, File, G3WSpatialRefSys, QgisProject
from django_downloadview.test import assert_download_response
from core.utils.slugify import slugify
from qplotly.models import QplotlyWidget

from .test_utils import CURRENT_PATH, QGS_FILE, TEST_BASE_PATH, get_data_plotly_settings_from_file, DATASOURCE_PATH
import json
import copy


@override_settings(
    LOAD_QPLOTLY_FROM_PROJECT=True,
    LANGUAGE_CODE='en',
    LANGUAGES = (
        ('en', 'English'),
    )
)
class QplotlyTestViews(QdjangoTestBase):

    @classmethod
    def setUpClass(cls):
        super(QplotlyTestViews, cls).setUpClass()

        cls.client = Client()

    def setUp(self):
        # main project group
        self.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        self.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        self.project = QgisProject(qgis_project_file)
        self.project.group = self.project_group
        self.project.save()
        qgis_project_file.close()

        file = File(open(f'{DATASOURCE_PATH}countries_pie_plot_with_title.xml', 'r'))
        self.countries_plot_xml = file.read()
        file.close()

        file = File(open(f'{DATASOURCE_PATH}cities_histogram_plot.xml', 'r'))
        self.cities_histogram_plot_xml = file.read()
        file.close()

    def test_download_xml(self):
        """Test download qplotly xml file capability"""

        # Create widget
        qwidget = QplotlyWidget(xml=self.cities_histogram_plot_xml)
        qwidget.save()

        # get download url
        url = reverse('qplotly-download-xml', kwargs={
            'pk': qwidget.pk
        })

        # test login required
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # test download
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        print(response['Content-Type'])
        assert_download_response(
            self,
            response,
            basename=f"qplotly_{slugify(qwidget.title)}.xml",
            content=qwidget.xml,
            mime_type="application/xml; charset=utf-8",
        )

        # widget not found
        url = reverse('qplotly-download-xml', kwargs={
            'pk': 1111111
        })

        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

        self.client.logout()

    def test_show_on_start_client_view(self):

        # Create widget
        qwidget = QplotlyWidget(xml=self.cities_histogram_plot_xml)
        qwidget.save()

        self.assertFalse(qwidget.show_on_start_client)

        # Get action url
        # action can be 'showonstartclient' or 'showinsidebar
        # case showonstartclient
        url = reverse('qplotly-project-layer-widget-action-set', kwargs={
            'action': 'showonstartclient',
            'pk': qwidget.pk
        })

        # test login required
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # Test set
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jresponse = json.loads(response.content)
        self.assertEqual(jresponse['status'], 'ok')

        qwidget.refresh_from_db()
        self.assertTrue(qwidget.show_on_start_client)

        response = self.client.get(f'{url}?show=0')
        self.assertEqual(response.status_code, 200)

        jresponse = json.loads(response.content)
        self.assertEqual(jresponse['status'], 'ok')

        qwidget.refresh_from_db()
        self.assertFalse(qwidget.show_on_start_client)

        # case showposition
        url = reverse('qplotly-project-layer-widget-action-set', kwargs={
            'action': 'showposition',
            'pk': qwidget.pk
        })

        # test login required
        response = self.client.post(url, data={'value': 'query'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        jresponse = json.loads(response.content)
        self.assertEqual(jresponse['status'], 'ok')

        qwidget.refresh_from_db()
        self.assertEqual(qwidget.show_position, 'query')

        response = self.client.post(url, data={'value': 'sidebar'})
        self.assertEqual(response.status_code, 200)

        jresponse = json.loads(response.content)
        self.assertEqual(jresponse['status'], 'ok')

        qwidget.refresh_from_db()
        self.assertEqual(qwidget.show_position, 'sidebar')

