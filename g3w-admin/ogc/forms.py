from django.forms import ModelForm
from django.utils.translation import ugettext, ugettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import Div, Field, HTML
from core.mixins.forms import *
from usersmanage.forms import G3WACLForm
from .models import *

class OgcProjetForm(G3WFormMixin, G3WRequestFormMixin, G3WACLForm, ModelForm):

    def __init__(self, *args, **kwargs):
        super(OgcProjetForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                            Div(
                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('General data'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            'name',
                                            'title',
                                            Field('description',css_class='wys5'),
                                            css_class='box-body',

                                        ),
                                        css_class='box box-success'
                                    ),
                                    css_class='col-md-6'
                                ),
                                css_class='row'
                            )
        )

    class Meta:
        model = Project
        fields = '__all__'