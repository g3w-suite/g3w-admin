# coding=utf-8
""""Caching module tests forms
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-14'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test.client import RequestFactory
from .base import CachingTestBase
from caching.forms import ActiveCachingLayerForm


class CachingFormTests(CachingTestBase):

    def test_active_caching_layer(self):
        """Test activation caching layer form"""

        request = RequestFactory()

        # No data
        form = ActiveCachingLayerForm(request=request)
        self.assertFalse(form.is_valid())

        # Empty data
        form = ActiveCachingLayerForm(request=request, data={})
        self.assertTrue(form.is_valid())

        # With data
        form = ActiveCachingLayerForm(request=request, data={'active': 1})
        self.assertTrue(form.is_valid())

        # For base layer CRUD
        # base_layer_title required with as_base_layer as true
        form = ActiveCachingLayerForm(request=request, data={'active': 1, 'as_base_layer': 1})
        self.assertFalse(form.is_valid())

        form = ActiveCachingLayerForm(request=request, data={'active': 1, 'as_base_layer': 1, 'base_layer_title': 'title'})
        self.assertTrue(form.is_valid())


