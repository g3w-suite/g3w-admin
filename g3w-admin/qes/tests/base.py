# coding=utf-8
"""" Base testing module for Qes

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-23'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'


from django.conf import settings
from qdjango.tests.base import QdjangoTestBase, override_settings
import requests


@override_settings(
        QES_INDEXING_PROJECT=False
)
class QesTesBase(QdjangoTestBase):

    def _query_es(self, q, method='GET', **kwargs):

        host = settings.ELASTICSEARCH_DSL['default']['hosts']

        # Global refresh
        url = f"{host}/_refresh"

        response = requests.post(url)

        if not response.status_code == 200:
            raise Exception(response.json())

        url = f"{host}/{q}?format=json"

        if method.upper() == 'POST':
            response = requests.post(url, json=kwargs['data'])
        else:
            response = requests.get(url)

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(response.json())