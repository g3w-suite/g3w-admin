# coding=utf-8
""""Module with views for qrastertimeseries.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-23'

from django.views.generic import \
    ListView, \
    CreateView
from django.urls import reverse_lazy
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from .models import QRasterTimeSeriesProject
from .forms import QRasterTimeSeriesProjectForm


class QRasterTimeSeriesProjectsListView(ListView):
    """List simple qrastertimeseries projects view."""
    template_name = 'qrastertimeseries/projects_list.html'
    model = QRasterTimeSeriesProject

    @method_decorator(permission_required('qrastertimeseries.add_qrastertimeseriesproject', return_403=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


class QRasterTimeSeriesProjectsAddView(G3WRequestViewMixin, CreateView):
    """
    Create view for single qrastertimeseries project
    """
    form_class = QRasterTimeSeriesProjectForm
    template_name = 'qrastertimeseries/project_form.html'
    success_url = reverse_lazy('qrastertimeseries-project-list')

    @method_decorator(permission_required('qrastertimeseries.add_qrastertimeseriesproject', return_403=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
