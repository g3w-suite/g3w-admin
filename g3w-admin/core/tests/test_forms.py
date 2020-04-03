# coding=utf-8
""""
    Core forms tests
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-03'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test import TestCase, override_settings
from django.test.client import RequestFactory
from usersmanage.tests.utils import setup_testing_user, teardown_testing_users
from core.forms import GroupForm
from core.models import G3WSpatialRefSys, MapControl, Group
from .utils import create_dff_image, clear_dff_image

@override_settings(CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
})
class CoreTestForm(TestCase):


    fixtures = [
        'BaseLayer.json',
        'G3WMapControls.json',
        'G3WSpatialRefSys.json',
        'G3WGeneralDataSuite.json'
    ]

    @classmethod
    def setUpClass(cls):

        super(CoreTestForm, cls).setUpClass()
        setup_testing_user(cls)

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

        form_data = {
            'title': 'Map group test',
            'name': 'Map group test',
            'description': 'Test',
            'srid': self.epsg.pk,
            'form_id': uf.form_id,
            'lang': 'it',
            'mapcontrols': [mp.pk for mp in self.map_controls]
        }

        form = GroupForm(request=self.request, data=form_data)
        self.assertTrue(form.is_valid())
        form.save()

        # check is it saved into db
        mg = Group.objects.get(name='Map group test')

    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        clear_dff_image()