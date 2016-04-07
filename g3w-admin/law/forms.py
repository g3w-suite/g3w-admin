from django.forms import ModelForm, ValidationError, Form, CharField, DateField
from django.utils.translation import ugettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, HTML, Row, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from .models import Laws, Articles


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
                                                PrependedText('fromdate', '<i class="fa fa-calendar"></i>', css_class='datepicker'),
                                                PrependedText('todate', '<i class="fa fa-calendar"></i>', css_class='datepicker'),
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

        if fromdate and todate and fromdate > todate:
            self.add_error('fromdate', ValidationError(_('Date from from must be less than Date to')))
            self.add_error('todate', ValidationError(_('Date to must be more than Date from')))


class LawNewVariationForm(Form):

    variation = CharField(label=_('New variation'), max_length=255)
    fromdate = DateField(label=_('New date from'))
    todate = DateField(label=_('New date to'))

    def __init__(self, *args, **kwargs):
        super(LawNewVariationForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                                Div(
                                    'variation',
                                    Row(
                                        Div(PrependedText('fromdate', '<i class="fa fa-calendar"></i>', css_class='datepicker'),css_class='col-md-6'),
                                        Div(PrependedText('todate', '<i class="fa fa-calendar"></i>', css_class='datepicker'),css_class='col-md-6'),
                                    ),
                                    css_class = 'col-md-12'
                                    )
                                )

    def clean(self):
        cleaned_data = super(LawNewVariationForm, self).clean()
        fromdate = cleaned_data.get("fromdate")
        todate = cleaned_data.get("todate")

        if fromdate and todate and fromdate > todate:
            self.add_error('fromdate', ValidationError(_('New date from from must be less than New date to')))
            self.add_error('todate', ValidationError(_('New date to must be more than New date from')))



class ArticleForm(ModelForm):

    class Meta:
        model = Articles
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        self.law = kwargs['law']
        del(kwargs['law'])
        super(ArticleForm, self).__init__(*args, **kwargs)
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
                                                Div(
                                                    Div(
                                                        'number',
                                                        css_class='col-md-6'
                                                    ),
                                                    Div(
                                                        'comma',
                                                        css_class='col-md-6'
                                                    ),
                                                    css_class='row'
                                                ),

                                                'title',
                                                Field('content', css_class='wys5'),
                                                css_class='box-body',
                                            ),
                                            css_class='box box-success'
                                        ),
                                        css_class='col-md-12'
                                    ),
                                    css_class='row'
                                )

        )

    def save(self, commit=True):

        # add law instance per article
        self.instance.law = self.law
        return super(ArticleForm, self).save(commit)
