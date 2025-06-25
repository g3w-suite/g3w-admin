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
            Fieldset(
                f"<i class='fa fa-file'></i> {_('Project')}",
                'project',
                Field('services'),
            ),
        )
