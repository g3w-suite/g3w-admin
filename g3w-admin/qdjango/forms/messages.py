# coding=utf-8
"""" Forms module for project's message system
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-31'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.forms import ModelForm, ValidationError, DateInput
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, HTML, Row, Field, Fieldset
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
        self.fields['valid_from'].widget = DateInput(attrs={'type': 'time', 'dir':'rtl', 'style':'text-align:left;'})
        self.fields['valid_to'].widget = DateInput(attrs={'type': 'date', 'dir':'rtl', 'style':'text-align:left;'})
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Fieldset(
                f"<i class='fa fa-file'></i> {_('Validity')}</h3>",
                'valid_from',
                'valid_to',
            ),
            Fieldset(
                f"<i class='fa fa-file'></i> {_('General data')}",
                Field('title', css_class='translate'),
                Field('body', css_class='wys5 translate'),
                'level',
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
