# coding=utf-8
"""" Qplotly main views module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-22'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.views.generic import View
from django.shortcuts import get_object_or_404
from qdjango.mixins.views import QdjangoProjectViewMixin, QdjangoLayerViewMixin
from django.http.response import JsonResponse
from qdjango.utils.models import comparedbdatasource
from .models import QplotlyWidget


class QplotlyLinkWidget2LayerView(QdjangoLayerViewMixin, View):
    """
    Activate or deactivate widget for layer.
    """
    def get(self, *args, **kwargs):
        self.widget = get_object_or_404(QplotlyWidget, pk=kwargs['pk'])
        try:
            self.linkUnlinkWidget(link=(not 'unlink' in self.request.GET))
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'errors_form': e.message})

    def linkUnlinkWidget(self, link=True):

        # apply check datasourc only for postgres and spatialite
        if self.layer.layer_type in ('postgres', 'spatialite') \
                and not comparedbdatasource(self.layer.datasource, self.widget.datasource, self.layer.layer_type):
            raise Exception('Datasource of widget is different from layer datasource')
        if link:
            self.widget.layers.add(self.layer)
        else:
            self.widget.layers.remove(self.layer)


