from django.forms import ModelForm
from django.utils.translation import ugettext, ugettext_lazy as _
from django_file_form.forms import FileFormMixin
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Submit, HTML, Button, Row, Field
from django_file_form.forms import UploadedFileField
from usersmanage.utils import get_fields_by_user, crispyBoxACL
from usersmanage.forms import G3WACLForm
from core.mixins.forms import *
from .models import Configs


class cduConfigInitForm(FileFormMixin, G3WFormMixin, G3WRequestFormMixin, G3WACLForm, ModelForm):
    """
    Form with title description Project map file and file template ODT
    """
    odtfile = UploadedFileField()

    def __init__(self,*args,**kwargs):
        self._init_users(**kwargs)
        super(cduConfigInitForm,self).__init__(*args,**kwargs)
        # change ows_user field label
        self.fields['own_users'].label = _('User users')
        self.helper = FormHelper(self)
        self.helper.form_tag = False

        self.helper.layout = Layout(
            Div(
                crispyBoxACL(self, boxCssClass='col-md-12'),
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('CDU base settings'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            'title',
                            Field('description', css_class='wys5'),
                            'project',
                            'odtfile',
                            'form_id',
                            'upload_url',
                            'delete_url',
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-12'
                ),
                css_class='row'
            ),
        )

    class Meta:
        model = Configs
        fields = '__all__'