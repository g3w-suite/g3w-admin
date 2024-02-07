# coding=utf-8
""""Forms for Openrouteservice

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-30'
__copyright__ = 'Copyright 2021, Gis3W'

from core.mixins.forms import *
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import HTML, Div, Field, Fieldset
from django.forms import ModelForm
from django.utils.translation import gettext_lazy as _

from .models import OpenrouteserviceProject


class OpenrouteserviceProjectForm(G3WFormMixin, G3WRequestFormMixin, ModelForm):
    """
    Form for Openrouteservice model.
    """
    class Meta:
        model = OpenrouteserviceProject
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
                            Field(
                                'services'),
                            css_class='box-body',
                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                ),
                css_class='row'
            ),
        )
