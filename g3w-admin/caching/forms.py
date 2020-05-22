from django import forms
from django.utils.translation import ugettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import HTML, Div
from core.mixins.forms import G3WRequestFormMixin, G3WProjectFormMixin


class ActiveCachingLayerForm(G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """Activation caching layer form"""

    active = forms.BooleanField(label=_('Active'), required=False)
    reset_layer_cache_url = forms.CharField(required=False, widget=forms.HiddenInput)

    def __init__(self, *args, **kwargs):

        super(ActiveCachingLayerForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                HTML(_('Check on uncheck to activate/deactivate caching layer capabilities:')),
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
                             "<li><a id='resetcache_for_project' href='#'><i class='fa fa-eraser'></i> {}</a></li>"
                             "</ul>".format(_('Reset cache'), _('Reset cache for project'))),
                            css_class='btn-group'
                        ),
                        css_class='col-md-9'
                    ),

                    css_class='row'
                ),

                css_class='col-md-12'
            )
        )