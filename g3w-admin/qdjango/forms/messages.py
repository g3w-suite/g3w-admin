# coding=utf-8
"""" Forms module for project's message system
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-31'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.forms import ModelForm, ValidationError
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, HTML, Row, Field
from crispy_forms.bootstrap import PrependedText
from django_bleach.forms import BleachField
from core.mixins.forms import G3WRequestFormMixin, G3WFormMixin, G3WProjectFormMixin, G3WGroupFormMixin
from qdjango.models import Message


class MessageForm(G3WFormMixin, G3WRequestFormMixin, G3WGroupFormMixin, G3WProjectFormMixin, ModelForm):
    """
    Form for project message
    """

    body = BleachField()

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
                                                    _('General data'))),
                                                css_class='box-header with-border'
                                            ),
                                            Div(
                                                Field('title', css_class='translate'),
                                                Field('body', css_class='wys5 translate'),
                                                'level',
                                                css_class='box-body',
                                            ),
                                            css_class='box box-success'
                                        ),
                                        css_class='col-md-6'
                                    ),

                                    Div(
                                        Div(
                                            Div(
                                                HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                                    _('Validity'))),
                                                css_class='box-header with-border'
                                            ),
                                            Div(
                                                PrependedText('valid_from', '<i class="fa fa-calendar"></i>', css_class='datepicker'),
                                                PrependedText('valid_to', '<i class="fa fa-calendar"></i>', css_class='datepicker'),
                                                css_class='box-body',
                                            ),
                                            css_class='box box-success'
                                        ),
                                        css_class='col-md-6'
                                    ),
                                    css_class = 'row'
                                ),
                            )

    def clean(self):
        cleaned_data = super().clean()

        # Validation of the relationship start date end date
        fromdate = cleaned_data.get("valid_to")
        todate = cleaned_data.get("valid_to")

        if fromdate and todate and fromdate > todate:
            self.add_error('valid_from', ValidationError(_('Date from from must be less than Date to')))
            self.add_error('valid_to', ValidationError(_('Date to must be more than Date from')))
    def save(self, commit=True):

        # Add project instance
        self.instance.project = self.project
        return super().save(commit)
    class Meta:
        model = Message
        fields = (
            'title',
            'body',
            'level',
            'valid_to',
            'valid_from'
        )
