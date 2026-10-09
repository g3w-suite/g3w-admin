# coding=utf-8
"""Smoke tests for the OpenAPI schema produced by drf-spectacular."""

__author__ = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2026, Gis3w'
__license__ = 'MPL 2.0'

from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient


class OpenAPISchemaTest(TestCase):
    """Validate that the OpenAPI schema can be generated and served."""

    def test_schema_endpoint_returns_openapi(self):
        client = APIClient()
        url = reverse('schema')
        resp = client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('openapi', resp['Content-Type'].lower())

    def test_swagger_ui_endpoint_renders(self):
        client = APIClient()
        url = reverse('swagger-ui')
        resp = client.get(url)
        self.assertEqual(resp.status_code, 200)

    def test_redoc_endpoint_renders(self):
        client = APIClient()
        url = reverse('redoc')
        resp = client.get(url)
        self.assertEqual(resp.status_code, 200)

    def test_schema_generates_without_errors(self):
        """`manage.py spectacular --validate` must run cleanly.

        Warnings are tolerated (third-party views without serializers); only
        hard errors fail the test.
        """
        out = StringIO()
        err = StringIO()
        call_command(
            'spectacular',
            '--validate',
            '--file', '/tmp/g3w-openapi-test.yml',
            stdout=out,
            stderr=err,
        )
        combined = (out.getvalue() + err.getvalue()).lower()
        # Acceptable: "errors: N" line in the summary. Failing keyword is an
        # unhandled exception or schema validation error.
        self.assertNotIn('traceback', combined)
        self.assertNotIn('invalid schema', combined)
