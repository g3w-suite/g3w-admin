# coding=utf-8
""""
mapproxy caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-19'
__copyright__ = 'Copyright 2023, Gis3w'

from django import forms
from django.utils.translation import ugettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import HTML, Div, Fieldset, Field
from core.mixins.forms import G3WRequestFormMixin, G3WProjectFormMixin


class ActiveMapproxyLayerForm(G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """Activation mapproxy layer form"""

    active = forms.BooleanField(label=_('Active'), required=False)
    reset_layer_cache_url = forms.CharField(required=False, widget=forms.HiddenInput)

    as_base_layer = forms.BooleanField(label=_('Save as base layer'), required=False)
    base_layer_title = forms.CharField(label=_('Base layer title'), required=False)
    base_layer_desc = forms.CharField(label=_('Base layer description'), widget=forms.Textarea, required=False)
    base_layer_attr = forms.CharField(label=_('Base layer attribution'), required=False)

    def __init__(self, *args, **kwargs):

        super(ActiveMapproxyLayerForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                HTML(_('Check on uncheck to activate/deactivate MapProxy layer capabilities:')),
                Div(
                    Div(
                        'active',
                        'reset_layer_cache_url',
                        css_class='col-md-3'
                    ),
                    Div(
                        Div(
                            HTML("<button type='button' class='btn btn-default dropdown-toggle' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>Action <span class='caret'></span></button>"),
                            HTML("<ul class='dropdown-menu'>"
                             "<li><a id='resetcache' href='#'><i class='fa fa-eraser'></i> {}</a></li>"
                             "</ul>".format(_('Reset MapProxy cache for layer'))),
                            css_class='btn-group'
                        ),
                        css_class='col-md-9'
                    ),

                    css_class='row'
                ),
                Div(
                    Div(
                        'as_base_layer',
                        Fieldset(
                            _('Base layer data'),
                            'base_layer_title',
                            'base_layer_desc',
                            'base_layer_attr',
                            css_class='base-layer-data',
                            disabled='disabled'
                        ),
                        css_class='col-md-12 base-layer-enable'
                    ),

                    css_class='row'
                ),

                css_class='col-md-12'
            )
        )

    def clean_base_layer_title(self):
        """ Clean base_layer_title not empty if as_base_layer is set """

        base_layer_title = self.cleaned_data['base_layer_title']
        if self.cleaned_data['as_base_layer'] and base_layer_title == '':
            raise forms.ValidationError(_('This field is required'))

        return base_layer_title