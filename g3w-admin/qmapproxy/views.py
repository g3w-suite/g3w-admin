# coding=utf-8
""""
mapproxy caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-19'
__copyright__ = 'Copyright 2023, Gis3w'

from django.apps import apps
from django.views.generic import FormView, View
from django.http import HttpResponse, JsonResponse
from django.db import transaction
from django.urls import reverse
from django.utils.translation import ugettext as _
from django.utils.decorators import method_decorator
from django.conf import settings
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from core.mixins.views import AjaxableFormResponseMixin, G3WRequestViewMixin, G3WProjectViewMixin
from core.utils.decorators import project_type_permission_required
from core.utils.geo import get_crs_bbox
from core.models import BaseLayer
from .forms import ActiveMapproxyLayerForm
from .models import G3WMapproxyLayer
from django.core.cache import caches
from qdjango.models import Layer as QdjangoLayer
from qgis.core import QgsCoordinateReferenceSystem
import time
import json


class ActiveMapproxyLayerView(AjaxableFormResponseMixin, G3WProjectViewMixin, G3WRequestViewMixin, FormView):
    """
    View for enabled mapproxy layer form
    """

    form_class = ActiveMapproxyLayerForm
    template_name = 'qmapproxy/mapproxy_layer_active_form.html'

    @method_decorator(project_type_permission_required('change_project', ('project_type', 'project_slug'),
                                                       return_403=True))
    def dispatch(self, request, *args, **kwargs):
        self.layer_id = kwargs['layer_id']
        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_form_kwargs(self):

        kwargs = super().get_form_kwargs()

        # get model by app
        Layer = apps.get_app_config(self.app_name).get_model('layer')
        self.layer = Layer.objects.get(pk=self.layer_id)

        kwargs['initial']['reset_layer_cache_url'] = reverse('qmapproxy-layer-reset', args=[
            self.layer.project.group.slug,
            self.project_slug,
            self.layer.pk
        ])

        # try to find mapproxy layer config
        try:
            self.activated = G3WMapproxyLayer.objects.get(layer_id=self.layer_id)
            kwargs['initial']['active'] = True
            if self.activated.baselayer_id != None:
                kwargs['initial']['as_base_layer'] = True
                kwargs['initial']['base_layer_title'] = self.activated.base_layer.title
                kwargs['initial']['base_layer_desc'] = self.activated.base_layer.description
                kwargs['initial']['base_layer_attr'] = self.activated.base_layer_attr

                # get base layer
                self.base_layer = self.activated.base_layer
            else:
                self.base_layer = None

        except Exception as e:
            self.activated = None
            kwargs['initial']['active'] = False
            kwargs['initial']['as_base_layer'] = False
            self.base_layer = None

        return kwargs

    def _crud_baselayer(self, form):
        """ CRUD base layer """

        if form.cleaned_data['as_base_layer']:

            # Create/update base layer
            if self.base_layer:

                # update
                self.base_layer.title = form.cleaned_data['base_layer_title']
                self.base_layer.description = form.cleaned_data['base_layer_desc']
                property = eval(self.base_layer.property)
                property['attributions'] = form.cleaned_data['base_layer_attr']
                self.base_layer.property = property
                self.base_layer.save()

            else:

                crs = QgsCoordinateReferenceSystem(f'EPSG:{self.layer.project.group.srid.srid}')

                grid_name = f'EPSG{self.layer.project.group.srid.srid}'

                # Standard grid names provided by mapproxy
                if self.layer.project.group.srid.srid == '4326':
                    grid_name = 'GLOBAL_GEODETIC'
                elif self.layer.project.group.srid.srid == '900913':
                    grid_name = 'GLOBAL_MERCATOR'
                elif self.layer.project.group.srid.srid == '3857':
                    grid_name = 'GLOBAL_WEBMERCATOR'


                property = {
                    "crs": {
                        "epsg": self.layer.project.group.srid.srid,
                        "proj4": crs.toProj4(),
                        "geographic": crs.isGeographic(),
                        "axisinverted": crs.hasAxisInverted(),
                        "extent": get_crs_bbox(crs)
                    },
                    "url": f"{settings.MAPPROXY_SERVER_URL}/mapproxy_conf_{self.layer.pk}/tms/{self.layer.name}/{grid_name}/"+r"{z}/{x}/{y}.png",
                    "servertype": "TMS",
                    "attributions": form.cleaned_data['base_layer_attr']
                }

                kwargs = {
                    'name': f'bl_from_mapproxy_layer_{self.layer.pk}',
                    'title': form.cleaned_data['base_layer_title'],
                    'description': form.cleaned_data['base_layer_desc'],
                    'property': property
                }

                self.base_layer = BaseLayer(**kwargs)
                self.base_layer.save()

                # update mapproxy layer config record
                self.activated.baselayer_id = self.base_layer.pk
                self.activated.save()
        else:
            # Delete base layer
            if self.base_layer and self.base_layer.pk:
                self.base_layer.delete()
            if self.activated.baselayer_id:
                self.activated.baselayer_id = None
                self.activated.save()



    @transaction.atomic
    def form_valid(self, form):

        if form.cleaned_data['active']:
            if not self.activated:
                self.activated, _ = G3WMapproxyLayer.objects.get_or_create(layer_id=self.layer_id)

            # Baselayer management
            self._crud_baselayer(form)
        else:
            if self.activated:
                self.activated.delete()
            if self.base_layer:
                self.base_layer.delete()

        return super(ActiveMapproxyLayerView, self).form_valid(form)


class ResetMapproxyLayerCacheView(View):
    """
    Reset cache layer
    """

    def get(self, request, *args, **kwargs):

        # Get mapproxy layer from layer_id
        mapproxy_layer = G3WMapproxyLayer.objects.get(layer_id=kwargs['layer_id'])

        # Invalidate mapproxy cache
        mapproxy_layer.invalidate_cache()

        return JsonResponse({'status': 'ok', 'message': _('Cache erased!')})


