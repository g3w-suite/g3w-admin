from django.forms import ModelForm, ValidationError
from django.utils.translation import ugettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Submit, HTML, Button, Row, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from .models import Laws


class LawForm(ModelForm):
    class Meta:
        model = Laws
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(LawForm, self).__init__(*args, **kwargs)
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
                                                'name',
                                                Field('description', css_class='wys5'),
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
                                                    _('General data'))),
                                                css_class='box-header with-border'
                                            ),
                                            Div(
                                                'varation',
                                                'fromdate',
                                                'todate',
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
        cleaned_data = super(LawForm, self).clean()
        fromdate = cleaned_data.get("fromdate")
        todate = cleaned_data.get("todate")

        if fromdate > todate:
            self.add_error('fromdate', ValidationError(_('Date from from must be less than Date to')))
            self.add_error('todate', ValidationError(_('Date to must be more than Date from')))

# place form definition here