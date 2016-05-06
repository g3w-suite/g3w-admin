from django_file_form.forms import FileFormMixin, UploadedFileField, UploadWidget
from django.forms import Form, ModelForm
from django.forms.fields import CharField
from django.utils.translation import ugettext, ugettext_lazy as _
from core.models import Group
from django_file_form.forms import FileFormMixin
from django.contrib.auth.models import User
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Submit, HTML, Button, Row, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from usersmanage.utils import get_fields_by_user, crispyBoxACL
from usersmanage.forms import G3WACLForm
from core.mixins.forms import *
from usersmanage.configs import *


class ExampleForm(FileFormMixin,Form):
    input_file = UploadedFileField()


class ExampleAjaxForm(Form):
    testo = CharField(required=True)


class GroupForm(FileFormMixin, G3WFormMixin, G3WRequestFormMixin, G3WACLForm, ModelForm):
    """Group form."""
    header_logo_img = UploadedFileField()

    def __init__(self, *args, **kwargs):
        super(GroupForm, self).__init__(*args, **kwargs)
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
                                            Field('description', css_class='wys5'),
                                            Field('lang', css_class='select2'),
                                            css_class='box-body',

                                        ),
                                        css_class='box box-success'
                                    ),
                                    css_class='col-md-6'
                                ),

                                crispyBoxACL(self),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-globe'></i> {}</h3>".format(_('GEO data'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Div(
                                                Div(
                                                    Field('srid', css_class='select2'),
                                                    css_class='col-md-12'
                                                ),
                                                css_class='row'
                                            ),
                                            Div(
                                                Div(PrependedText('max_scale','1:'),css_class='col-md-6'),
                                                Div(PrependedText('panoramic_max_scale','1:'),css_class='col-md-6'),
                                                Div(PrependedText('min_scale','1:'),css_class='col-md-6'),
                                                Div(PrependedText('panoramic_min_scale','1:'),css_class='col-md-6'),
                                                css_class='row'
                                            ),
                                            css_class='box-body'
                                        ),
                                        css_class='box box-danger'
                                    ),
                                    css_class='col-md-6'
                                ),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-map'></i> {}</h3>".format(_('Third party maps'))),
                                            Div(
                                                HTML("<button class='btn btn-box-tool' data-widget='collapse'><i class='fa fa-minus'></i></button>"),
                                                css_class='box-tools',
                                            ),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            'use_commercial_maps',
                                            'use_osm_maps',
                                            css_class='box-body'
                                        ),
                                        css_class='box box-danger {}'.format(self.checkEmptyInitialsData('use_commercial_maps','use_osm_maps'))
                                    ),
                                    css_class='col-md-6'
                                ),
                                css_class='row'
                            ),

                            Div(
                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-file-image-o'></i> {}</h3>".format(_('Logo/Picture'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Div(
                                                'header_logo_img',
                                                HTML("""{% if form.header_logo_img.value %}<img class="507981" src="{{ MEDIA_URL }}{{ form.header_logo_img.value }}">{% endif %}""", ),
                                                'form_id',
                                                'upload_url',
                                                'delete_url',
                                                css_class='col-md-6'
                                            ),
                                            Div(
                                                AppendedText('header_logo_height','px'),
                                                PrependedText('header_logo_link','http://'),
                                                css_class='col-md-6'
                                            ),
                                            css_class='box-body'
                                        ),
                                        css_class='box box-primary'
                                    ),
                                    css_class='col-md-6'
                                ),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-copyright'></i> {}</h3>".format(_('Copyright'))),
                                            Div(
                                                HTML("<button class='btn btn-box-tool' data-widget='collapse'><i class='fa fa-minus'></i></button>"),
                                                css_class='box-tools',
                                            ),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Field('header_terms_of_use_text',css_class='wys5'),
                                            'header_terms_of_use_link',
                                            css_class='box-body'
                                        ),
                                        css_class='box box-default {}'.format(self.checkEmptyInitialsData('header_terms_of_use_text','header_terms_of_use_link'))
                                    ),
                                    css_class='col-md-6'
                                ),
                                css_class='row'
                            )
                        )

    class Meta:
        model = Group
        fields = '__all__'

    def save(self, commit=True):
        super(GroupForm, self).save()
        self._ACLPolicy()






