# coding=utf-8
""""
    Test for utils module into core module.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-18'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


import re

from crispy_forms.layout import Div
from django.core.exceptions import PermissionDenied
from django.core.files import File
from django.forms import Form
from django.http import HttpResponse
from django.test import RequestFactory, TestCase
from django.urls import reverse
from guardian.exceptions import GuardianError
from guardian.shortcuts import assign_perm, get_anonymous_user
from import_export.resources import ModelResource

from core.models import Group
from core.utils.db import build_dango_connection_name
from core.utils.decorators import project_type_permission_required
from core.utils.forms import crispyBoxBaseLayer, crispyBoxMacroGroups
from core.utils.general import *
from core.utils.geo import camel_geometry_type
from core.utils.ie import modelresource_factory
from core.utils.projects import countAllProjects
from core.utils.response import send_file
from qdjango.models import Project

from .base import CoreTestBase
from .utils import CURRENT_PATH, TEST_BASE_PATH


class FormRequestTest(Form):
    """ Test form with request property """

    def __init__(self, *args, **kwargs):

        # get request object from kwargs
        if 'request' in kwargs:
            self.request = kwargs['request']
            del (kwargs['request'])

        super().__init__(*args, **kwargs)


class CoreUtilsTest(CoreTestBase):

    # These are stored in core module
    fixtures = CoreTestBase.fixtures + [
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.prj = Project.objects.get(title='Un progetto')

    def test_build_dango_connection_name(self):
        """ Test same name function """
        ds = "dbname='geo_demo' host=localhost port=5432 user='postgres' password='xxxxxxx' sslmode=disable " \
             "key='id' srid=3003 type=MultiPolygon table=\"verde_pubblico\".\"edifici\" (geom) sql="

        # Test return a md5 string
        dsmd5 = build_dango_connection_name(ds)
        self.assertTrue(re.match("[a-fA-F0-9]{32}", dsmd5))

    def test_ucfirst(self):
        """ Test same name function """

        self.assertEqual(ucfirst('aaaa'), 'Aaaa')

    def test_getAuthPermissionContentType(self):
        """ Test same name function """

    def test_get_adminlte_skin_by_user(self):
        """ Test same name function """

        self.assertEqual(get_adminlte_skin_by_user(self.test_admin1), 'yellow')
        self.assertEqual(get_adminlte_skin_by_user(self.test_admin2), 'red')
        self.assertEqual(get_adminlte_skin_by_user(
            self.test_editor1), 'purple')
        self.assertEqual(get_adminlte_skin_by_user(
            self.test_editor2), 'purple')
        self.assertEqual(get_adminlte_skin_by_user(self.test_viewer1), 'green')

    def test_project_type_permission_required(self):
        """ Test same name function decorator """

        @project_type_permission_required('change_project', ('project_type', 'project_slug'), return_403=True)
        def a_view(request, **kwargs):
            return HttpResponse()

        url_params = {
            'group_slug': self.prj.group.slug,
            'project_type': 'qdjango',
            'project_slug': self.prj.slug
        }

        rfactory = RequestFactory()
        url = reverse('group-project-slug-map', args=url_params.values())
        request = rfactory.get(url)
        request.user = get_anonymous_user()

        with self.assertRaises(PermissionDenied):
            response = a_view(request, **url_params)

        # As Admin1
        request.user = self.test_admin1

        response = a_view(request, **url_params)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response, HttpResponse)

        # As Viewer level 1 without permission
        request.user = self.test_viewer1

        with self.assertRaises(PermissionDenied):
            response = a_view(request, **url_params)

        # As Viewer lelvel 1 with permission
        assign_perm('change_project', self.test_viewer1, self.prj)
        request.user = self.test_viewer1

        response = a_view(request, **url_params)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response, HttpResponse)

        # Check no apps in apps list settings
        url_params.update({
            'project_type': 'XXXX'
        })

        with self.assertRaises(GuardianError):
            response = a_view(request, **url_params)

    def test_crispyBoxBaseLayer(self):
        """ Test function utils with same name """

        # Expected a Crispy div object
        self.assertIsInstance(crispyBoxBaseLayer(Form()), Div)

    def test_crispyBoxMacroGroups(self):
        """ Test function utils with same name """

        # Expected a Crispy div object or nothing
        request = RequestFactory()

        # As admin1
        request.user = self.test_admin1
        form = FormRequestTest(request=request)
        self.assertIsInstance(crispyBoxMacroGroups(form), Div)

        # As Editor level 1
        request.user = self.test_editor1
        self.assertIsInstance(crispyBoxMacroGroups(form), Div)

        # As anonymous user, viwer level1
        for u in (get_anonymous_user(), self.test_viewer1):
            request.user = u
            self.assertIsNone(crispyBoxMacroGroups(form))

    def test_camel_geometry_type(self):
        """ Test function utils with same name """

        self.assertEqual(camel_geometry_type('polygon'), 'Polygon')
        self.assertEqual(camel_geometry_type('polYgon'), 'Polygon')
        self.assertEqual(camel_geometry_type('POLYGON'), 'Polygon')

        with self.assertRaises(KeyError):
            self.assertEqual(camel_geometry_type('POLYGONO'), 'Polygon')

    def test_modelresource_factory(self):
        """ Test function utils with same name """

        model_resource = modelresource_factory(Group)
        self.assertIs(type(model_resource), type(ModelResource))

    def test_countAllProjects(self):
        """ Test function utils with same name """
        pcount = 0
        for g in Group.objects.all():
            pcount += len(g.getProjects())

        self.assertEqual(countAllProjects(), pcount)

    def test_send_file(self):
        """ Test function utils send_file """

        file = f'{CURRENT_PATH}{TEST_BASE_PATH}g3wsuite_logo.png'

        response = send_file('test_send_file.png',
                             'image/png', file, attachment=True)
        self.assertEqual(response.status_code, 200)

        fobj = open(file, 'rb')
        self.assertEqual(response.filename, 'test_send_file.png')
        self.assertTrue(response.as_attachment)
        self.assertEqual(fobj.read(), b''.join(response.streaming_content))
        fobj.close()
