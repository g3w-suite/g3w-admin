# coding=utf-8
"""" Forms module for QRasterTimeSeries.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-23'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'


from django.forms.models import ModelForm
from django.utils.translation import ugettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, HTML, Field
from core.mixins.forms import G3WRequestFormMixin, G3WFormMixin
from .models import QRasterTimeSeriesLayer, QRasterTimeSeriesProject
from .utils.models import allowed_layers_for_timeseries


class QRasterTimeSeriesProjectForm(G3WFormMixin, G3WRequestFormMixin, ModelForm):
    """
    Form for QRasterTimeSeriesProject model.
    """
    class Meta:
        model = QRasterTimeSeriesProject
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                                Div(
                                    Div(
                                        Div(
                                            Div(
                                                HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                                    _('Project'))),
                                                css_class='box-header with-border'
                                            ),
                                            Div(
                                                'project',
                                                Field('note', css_class='wys5'),
                                                css_class='box-body',
                                            ),
                                            css_class='box box-success'
                                        ),
                                        css_class='col-md-12'
                                    ),
                                    css_class='row'
                                ),
                            )


class QRasterTimeSeriesLayerForm(G3WFormMixin, G3WRequestFormMixin, ModelForm):
    """
        Form for QRasterTimeSeriesLayer model.
        """

    class Meta:
        model = QRasterTimeSeriesLayer
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # build queryset for reporting vector layer
        self.fields['layer'].queryset = allowed_layers_for_timeseries(self.instance)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                                Div(
                                    Div(
                                        Div(
                                            Div(
                                                HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                                    _('NETCDF Raster Layer'))),
                                                css_class='box-header with-border'
                                            ),
                                            Div(
                                                Field('qrastertimeseries_project', type='hidden'),
                                                'layer',
                                                Field('note', css_class='wys5'),
                                                css_class='box-body',
                                            ),
                                            css_class='box box-success'
                                        ),
                                        css_class='col-md-12'
                                    ),
                                    css_class='row'
                                ),
                            )