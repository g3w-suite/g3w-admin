# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-24'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.views.generic import FormView
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from core.utils.qgisapi import get_qgis_layer
from core.mixins.views import AjaxableFormResponseMixin, G3WRequestViewMixin, G3WProjectViewMixin
from qdjango.models import Layer, Project
from .vendor.RasterTimeseriesManager.core.rtmrastertimeseries import RtmRasterTimeseries as RTS
from .models import QRasterTimeSeriesLayer
from .forms import ActiveRasterTimeSeriesLayerForm


class ActiveRasterTimeSeriesLayerView(AjaxableFormResponseMixin, G3WRequestViewMixin, FormView):
    """
    View for enabled raster time series layer form
    """

    form_class = ActiveRasterTimeSeriesLayerForm
    template_name = 'qtimeseries/raster_layer_active_form.html'

    @method_decorator(permission_required('qdjango.change_project', (Project, 'pk', 'project_id'),
                                          raise_exception=True))
    def dispatch(self, request, *args, **kwargs):
        self.layer_id = kwargs['layer_id']

        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_form_kwargs(self):

        kwargs = super().get_form_kwargs()

        # get model by app
        self.layer = Layer.objects.get(pk=self.layer_id)
        # try to find notes config
        try:
            self.activated = QRasterTimeSeriesLayer.objects.get(layer=self.layer)
            kwargs['initial']['active'] = True
        except:
            self.activated = None
            kwargs['initial']['active'] = False

        return kwargs

    def form_valid(self, form):
        if form.cleaned_data['active']:
            if not self.activated:
                self.activated = QRasterTimeSeriesLayer.objects.create(layer=self.layer)
            else:
                self.activated.save()

            # Add start date and end date
            rts = RTS(get_qgis_layer(self.layer))
            dates = rts.dates()
            start_date = dates[0].toPyDate()
            end_date = dates[-1].toPyDate()

            self.activated.start_date = start_date
            self.activated.end_date = end_date
            self.activated.save()

        else:
            if self.activated:
                self.activated.delete()

        return super().form_valid(form)