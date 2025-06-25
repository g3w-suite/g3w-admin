from django import forms
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import HTML, Div, Fieldset, Field
from core.mixins.forms import G3WRequestFormMixin, G3WProjectFormMixin


class ActiveCachingLayerForm(G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """Activation caching layer form"""

    active = forms.BooleanField(label=_('Active'), required=False)
    reset_layer_cache_url = forms.CharField(required=False, widget=forms.HiddenInput)

    as_base_layer = forms.BooleanField(label=_('Save as base layer'), required=False)
    base_layer_title = forms.CharField(label=_('Base layer title'), required=False)
    base_layer_desc = forms.CharField(label=_('Base layer description'), widget=forms.Textarea, required=False)
    base_layer_attr = forms.CharField(label=_('Base layer attribution'), required=False)

    def __init__(self, *args, **kwargs):

        super(ActiveCachingLayerForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            HTML(f"{_('Check on uncheck to activate/deactivate caching layer capabilities:')}"),
            Div(
                Div(
                    'active',
                    'reset_layer_cache_url',
                ),
                HTML(
                    f"""
                    <details style="position: relative; position: relative;margin-left: 100px;">
                        <summary class="btn btn-default">Action <span class="caret"></span></summary>
                        <span class="message"></span>
                        <div style="position: absolute;display: flex;flex-direction: column;left: 0;border: 1px solid #eee;">
                            <a href="#" class="btn" style="text-align:left;" id="resetcache"><i class="fa fa-eraser"></i> { _('Reset cache') }</a>
                            <a href="#" class="btn" style="text-align:left;" id="resetcache_for_project"><i class="fa fa-eraser"></i> { _('Reset cache for project') }</a>
                    </div></details>
                    """
                ),
                style='display:flex;'
            ),
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
                css_class='base-layer-enable'
            ),
        )

    def clean_base_layer_title(self):
        """ Clean base_layer_title not empty if as_base_layer is set """

        base_layer_title = self.cleaned_data['base_layer_title']
        if self.cleaned_data['as_base_layer'] and base_layer_title == '':
            raise forms.ValidationError(_('This field is required'))

        return base_layer_title