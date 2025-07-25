# coding=utf-8
"""" Qplotly main views module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-22'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.views.generic import View, TemplateView
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from qdjango.mixins.views import QdjangoProjectViewMixin, QdjangoLayerViewMixin
from django.core.files.base import ContentFile
from django.http.response import JsonResponse
from django_downloadview import VirtualDownloadView
from qdjango.utils.models import comparedbdatasource
from qdjango.models import Project
from core.utils.slugify import slugify
from .models import QplotlyWidget
from .utils.models import get_qplotlywidgets4project
import json


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

@method_decorator(csrf_exempt, name='dispatch')
class QplotlyWidgetChangeActionView(View):
    """
    Set on true or false show_on_start_client model property or value for other property.
    """

    _actions_map = {
        'showonstartclient': 'show_on_start_client',
        'showposition': 'show_position',
    }

    def dispatch(self, request, *args, **kwargs):

        self.widget = get_object_or_404(QplotlyWidget, pk=kwargs['pk'])

        return super().dispatch(request, *args, **kwargs)

    def get(self, *args, **kwargs):
        
        try:
            self.change_status(action=kwargs['action'], value=(not 'show' in self.request.GET))
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'errors_form': e})
        
    def post(self, *args, **kwargs):

        try:
            if self.request.content_type == 'application/json':
                data = json.loads(self.request.body)
            else:
                data = self.request.POST
            self.change_status(action=kwargs['action'], value=data.get('value', None))
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'errors_form': e})        

    def change_status(self, action='show_on_start_client',value=True):

        if value is not None:
            setattr(self.widget, self._actions_map[action], value)
            self.widget.save()




class QplotlyDownloadView(VirtualDownloadView):
    """Download of xml qplotly file config"""

    def get(self, request, *args, **kwargs):
        self.widget = get_object_or_404(QplotlyWidget, pk=kwargs['pk'])

        return super().get(request, *args, **kwargs)

    def get_file(self):
        """Return :class:`django.core.files.base.ContentFile` object."""

        title = slugify(self.widget.title)
        return ContentFile(self.widget.xml, name=f"qplotly_{title}.xml")


class QplotlyProjectPlotsListView(TemplateView):
    """
    View to show in a table the list of plots by project
    """

    template_name = 'qplotly/plots_list_order.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)

        # Get every qplotly plots for the project
        ctx['project'] = Project.objects.get(pk=kwargs['project_id'])
        ctx['plots'] = get_qplotlywidgets4project(ctx['project'])

        return ctx


class QploltyWidgetSetOrderView(View):
    '''
    Set order view list widgets
    '''

    # only user with change_group for this group can change overview map.
    # @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    # def dispatch(self, *args, **kwargs):
    #     return super().dispatch(*args, **kwargs)

    def post(self, *args, **kwargs):
        # get new order save value for group
        new_order = self.request.POST.getlist('new_order[]')
        for oindex, gid in enumerate(new_order):
            p = QplotlyWidget.objects.get(pk=gid.split('_')[1])
            p.order = oindex
            p.save()

        return JsonResponse({'Saved': 'ok'})