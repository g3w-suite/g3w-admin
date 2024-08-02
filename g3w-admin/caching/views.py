# -*- coding: utf-8 -*-
from django.apps import apps
from django.views.generic import FormView, View
from django.http import HttpResponse, JsonResponse
from django.db import transaction
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.utils.decorators import method_decorator
import TileStache
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from core.mixins.views import AjaxableFormResponseMixin, G3WRequestViewMixin, G3WProjectViewMixin
from core.utils.decorators import project_type_permission_required
from core.utils.geo import get_crs_bbox
from core.models import BaseLayer
from .forms import ActiveCachingLayerForm
from .models import G3WCachingLayer
from .utils import get_config, TilestacheConfig
from .api.permissions import TilePermission
from django.core.cache import caches
from qdjango.models import Layer as QdjangoLayer
from qgis.core import QgsCoordinateReferenceSystem
import time
import json


class ActiveCachingLayerView(AjaxableFormResponseMixin, G3WProjectViewMixin, G3WRequestViewMixin, FormView):
    """
    View for enabled caching layer form
    """

    form_class = ActiveCachingLayerForm
    template_name = 'caching/caching_layer_active_form.html'

    @method_decorator(project_type_permission_required('change_project', ('project_type', 'project_slug'),
                                                       return_403=True))
    def dispatch(self, request, *args, **kwargs):
        self.layer_id = kwargs['layer_id']
        return super(ActiveCachingLayerView, self).dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_form_kwargs(self):

        kwargs = super(ActiveCachingLayerView, self).get_form_kwargs()

        # get model by app
        Layer = apps.get_app_config(self.app_name).get_model('layer')
        self.layer = Layer.objects.get(pk=self.layer_id)

        kwargs['initial']['reset_layer_cache_url'] = reverse('caching-layer-reset', args=[
            self.layer.project.group.slug,
            self.app_name,
            self.project_slug,
            self.layer.pk
        ])

        # try to find caching layer config
        try:
            self.activated = G3WCachingLayer.objects.get(app_name=self.app_name, layer_id=self.layer_id)
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

                # create
                # create OL config data
                # i.e.:
                # {
                #     "crs": {
                #           "epsg": 32632,
                #           "proj4": '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',
                #           "geographic": False,
                #           "axisinverted": False
                #     },
                #     "url": "https://dev.g3wsuite.it/caching/api/qdjango30/{z}/{x}/{y}.png",
                #     "servertype": "TMS",
                #     "attributions": "Ortofoto Piemonte AGEA 2015"
                # }

                crs = QgsCoordinateReferenceSystem(f'EPSG:{self.layer.project.group.srid.srid}')

                property = {
                    "crs": {
                        "epsg": self.layer.project.group.srid.srid,
                        "proj4": crs.toProj4(),
                        "geographic": crs.isGeographic(),
                        "axisinverted": crs.hasAxisInverted(),
                        "extent": get_crs_bbox(crs)
                    },
                    "url": f"/caching/api/{self.layer._meta.app_label}{self.layer.pk}/"+"{z}/{x}/{y}.png",
                    "servertype": "TMS",
                    "attributions": form.cleaned_data['base_layer_attr']
                }

                kwargs = {
                    'name': f'bl_from_cached_layer_{self.layer.pk}',
                    'title': form.cleaned_data['base_layer_title'],
                    'description': form.cleaned_data['base_layer_desc'],
                    'property': property
                }

                self.base_layer = BaseLayer(**kwargs)
                self.base_layer.save()

                # update caching layer config record
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

        #tilestache_cfg = get_config()

        if form.cleaned_data['active']:
            if not self.activated:
                self.activated = G3WCachingLayer.objects.create(app_name=self.app_name, layer_id=self.layer_id)

            # Baselayer management
            self._crud_baselayer(form)
        else:
            if self.activated:
                self.activated.delete()
            if self.base_layer:
                self.base_layer.delete()

        TilestacheConfig.set_cache_config_dict(TilestacheConfig().config_dict)

        return super(ActiveCachingLayerView, self).form_valid(form)


class ResetLayerCacheView(View):
    """
    Reset cache layer
    """

    def _reset_layer_cache(self, project_type, layer_id):
        self.tilestache_cfg.erase_cache_layer('{}{}'.format(project_type, layer_id))

    def get(self, request, *args, **kwargs):

        # check for project layer resect
        project_mode = 'reset_by_project' in request.GET
        self.tilestache_cfg = get_config()
        if project_mode:

            cache_module = __import__('{}.cache'.format(kwargs['project_type']))
            get_layer_to_erase_for_project = getattr(cache_module.cache, 'get_layer_to_erase_for_project')

            layers = get_layer_to_erase_for_project(kwargs['layer_id'])
            for l in layers:
                self._reset_layer_cache(kwargs['project_type'], l.pk)

        else:
            self._reset_layer_cache(kwargs['project_type'], kwargs['layer_id'])

        return JsonResponse({'status': 'ok', 'message': _('Cache erased!')})


class TileStacheTileApiView(APIView):
    """
    renders tilestache tiles
    based on django-tilestache tilestache api view:
    https://gitlab.sigmageosistemas.com.br/dev/django-tilestache/blob/master/django_tilestache/views.py
    """

    permission_classes = (
        TilePermission,
    )

    def get(self, request, layer_name, z, x, y, extension):
        """
        Fetch tiles with tilestache.
        """

        try:
            extension = extension.upper()
            config = get_config().config
            path_info = "{}/{}/{}/{}.{}".format(layer_name, z, x, y, extension)
            coord, extension = TileStache.splitPathInfo(path_info)[1:]
            try:
                tilestache_layer = config.layers[layer_name]
            except:
                return Response({'status': 'layer not found'}, status=status.HTTP_404_NOT_FOUND)

            status_code, headers, content = tilestache_layer.getTileResponse(coord, extension)

            mimetype = headers.get('Content-Type')
            if len(content) == 0:
                status_code = 404

            response = HttpResponse(
                content,
                **{
                    'content_type': mimetype,
                    'status': status_code
                }
            )
            if hasattr(tilestache_layer, 'allowed origin'):
                response['Access-Control-Allow-Origin'] = tilestache_layer.get('allowed origin')
            return response
        except Exception as ex:
            return Response(
                {
                    'status': 'error',
                    'message': str(ex)
                },
                status=status.HTTP_404_NOT_FOUND
            )
