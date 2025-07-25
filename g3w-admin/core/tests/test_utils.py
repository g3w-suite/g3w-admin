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
from django.contrib.admin import AdminSite
from django.test import RequestFactory, TestCase, override_settings
from django.urls import reverse
from guardian.exceptions import GuardianError
from guardian.shortcuts import assign_perm, get_anonymous_user
from import_export.resources import ModelResource

from core.models import Group, StatusLog
from core.admin import StatusLogAdmin
from core.utils.db import build_dango_connection_name
from core.utils.decorators import project_type_permission_required
from core.utils.forms import crispyBoxBaseLayer, crispyBoxMacroGroups
from core.utils.general import *
from core.utils.geo import camel_geometry_type
from core.utils.ie import modelresource_factory
from core.utils.projects import countAllProjects
from core.utils.response import send_file
from core.utils.logs.db_handler import DatabaseLogHandler
from core.utils.slugify import django_slugify, django_slugify_allow_unicode, pyslugify
from qdjango.models import Project

from .base import CoreTestBase
from .utils import CURRENT_PATH, TEST_BASE_PATH

import logging


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


    def test_django_slugify(self):
        self.assertEqual(django_slugify('This is a test ---'), 'this-is-a-test')
        self.assertEqual(django_slugify('影師嗎'), '')
        self.assertEqual(django_slugify('Computer-Компютър-111'), 'computer-111')
        self.assertEqual(django_slugify('jaja---lol-méméméoo--a'), 'jaja-lol-mememeoo-a')
        self.assertEqual(django_slugify('i love 🦄'), 'i-love')

    def test_django_slugify_with_unicode(self):
        self.assertEqual(django_slugify_allow_unicode('This is a test ---'), 'this-is-a-test')
        self.assertEqual(django_slugify_allow_unicode('影師嗎'), '影師嗎')
        self.assertEqual(django_slugify_allow_unicode('Computer-Компютър-111'), 'computer-компютър-111')
        self.assertEqual(django_slugify_allow_unicode('jaja---lol-méméméoo--a'), 'jaja-lol-méméméoo-a')
        self.assertEqual(django_slugify_allow_unicode('i love 🦄'), 'i-love')

    def test_django_pyslugify(self):
        self.assertEqual(pyslugify('This is a test ---'), 'this-is-a-test')
        self.assertEqual(pyslugify('影師嗎'), 'ying-shi-ma')
        self.assertEqual(pyslugify('Computer-Компютър-111'), 'computer-kompiutr-111')
        self.assertEqual(pyslugify('jaja---lol-méméméoo--a'), 'jaja-lol-mememeoo-a')
        self.assertEqual(pyslugify('i love 🦄'), 'i-love')

class TestDbLogger(TestCase):
    def setUp(self):

        self.logger = logging.getLogger('django')
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(DatabaseLogHandler())
        self.status_log_admin = StatusLogAdmin(StatusLog, AdminSite())

    def __test_log_aux(self, msg, fn, level):
        fn(msg)
        log_queryset = StatusLog.objects.filter(msg=msg)
        self.assertEqual(log_queryset.count(), 2)
        log = log_queryset[0]
        self.assertEqual(level, log.level)
        self.assertIsNone(log.trace)
        return log

    def test_log(self):
        log = self.__test_log_aux('Info Message', self.logger.info, logging.INFO)
        self.assertEqual(self.status_log_admin.colored_msg(log),
                         '<span style="color: green;">Info Message</span>')

        log = self.__test_log_aux('Warning Message', self.logger.warning, logging.WARNING)
        self.assertEqual(self.status_log_admin.colored_msg(log),
                         '<span style="color: orange;">Warning Message</span>')

        log = self.__test_log_aux('Debug Message', self.logger.debug, logging.DEBUG)
        self.assertEqual(self.status_log_admin.colored_msg(log),
                         '<span style="color: orange;">Debug Message</span>')



        log = self.__test_log_aux('Error Message', self.logger.error, logging.ERROR)
        self.assertEqual(self.status_log_admin.colored_msg(log),
                         '<span style="color: red;">Error Message</span>')

        log = self.__test_log_aux('Fatal Message', self.logger.fatal, logging.FATAL)
        self.assertEqual(self.status_log_admin.colored_msg(log),
                         '<span style="color: red;">Fatal Message</span>')
        self.assertEqual(self.status_log_admin.traceback(log), '<pre><code></code></pre>')

    def test_exception(self):
        exception_message = 'Exception Message'
        try:
            raise Exception(exception_message)
        except Exception as e:
            self.logger.exception(e)

        log_queryset = StatusLog.objects.filter(msg=exception_message)
        self.assertEqual(log_queryset.count(), 1)
        log = log_queryset.get()
        self.assertEqual(logging.ERROR, log.level)
        self.assertIsNotNone(log.trace)
