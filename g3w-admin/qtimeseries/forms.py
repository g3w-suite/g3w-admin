# coding=utf-8
"""" Forms module for QRasterTimeSeries.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-23'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django import forms
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import Div, Field, HTML
from core.mixins.forms import G3WRequestFormMixin, G3WProjectFormMixin


class ActiveRasterTimeSeriesLayerForm(G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):

    active = forms.BooleanField(label=_('Active'), required=False)

    def __init__(self, *args, **kwargs):

        super().__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            HTML(_('Check on uncheck to attive/deactive time series layer capabilities:')),
            'active'
        )