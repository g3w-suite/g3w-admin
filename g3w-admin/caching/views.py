# -*- coding: utf-8 -*-
from django.apps import apps
from django.views.generic import FormView, View
from django.http import HttpResponse, JsonResponse
from django.db import transaction
from django.urls import reverse
from django.utils.translation import ugettext as _
from django.utils.decorators import method_decorator
import TileStache
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from core.mixins.views import AjaxableFormResponseMixin, G3WRequestViewMixin, G3WProjectViewMixin
from core.utils.decorators import project_type_permission_required
from .forms import ActiveCachingLayerForm
from .models import G3WCachingLayer
from .utils import get_config, TilestacheConfig
from .api.permissions import TilePermission
from django.core.cache import caches
from qdjango.models import Layer as QdjangoLayer
import time


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

        # try to find notes config
        try:
            self.activated = G3WCachingLayer.objects.get(app_name=self.app_name, layer_id=self.layer_id)
            kwargs['initial']['active'] = True
        except:
            self.activated = None
            kwargs['initial']['active'] = False

        return kwargs

    @transaction.atomic
    def form_valid(self, form):

        #tilestache_cfg = get_config()

        if form.cleaned_data['active']:
            if not self.activated:
                caching_layer = G3WCachingLayer.objects.create(app_name=self.app_name, layer_id=self.layer_id)
                #tilestache_cfg.add_layer(str(caching_layer), caching_layer)
        else:
            if self.activated:
                #tilestache_cfg.remove_layer(str(self.activated))
                self.activated.delete()
        #tilestache_cfg.save_hash_file()
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
                    'message': ex.message
                },
                status=status.HTTP_404_NOT_FOUND
            )
