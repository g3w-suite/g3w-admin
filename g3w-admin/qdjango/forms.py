from django import forms
from django.forms import ValidationError, widgets
from django.utils.translation import ugettext, ugettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import Div, Field, HTML
from core.mixins.forms import *
from core.utils.forms import crispyBoxBaseLayer
from usersmanage.forms import G3WACLForm
from django_file_form.forms import FileFormMixin, UploadedFileField
from .models import *
from usersmanage.utils import get_fields_by_user, crispyBoxACL
from .utils.data import QgisProject, ProjectExists


class QdjangoProjectFormMixin(object):
    """
    Mixin for project qdjango form, clean policy ofr qgisfile
    """
    def clean_qgis_file(self):
        try:
            qgis_file = self.cleaned_data['qgis_file']
            kwargs = {'group': self.group}
            if self.instance.pk:
                kwargs['instance'] = self.instance
            self.qgisProject = QgisProject(qgis_file,**kwargs)
            if not self.instance.pk:
                self.qgisProject.registerValidator(ProjectExists)
            self.qgisProject.clean()
        except Exception as e:
            '''
            if settings.DEBUG:
                raise e
            else:
            '''
            raise ValidationError(e)
        return qgis_file


class QdjangoProjetForm(QdjangoProjectFormMixin, G3WFormMixin, G3WGroupFormMixin, G3WGroupBaseLayerFormMixin, G3WRequestFormMixin, G3WACLForm, FileFormMixin, forms.ModelForm):

    qgis_file = UploadedFileField(required=True)
    thumbnail = UploadedFileField(required=False)

    def __init__(self, *args, **kwargs):
        super(QdjangoProjetForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                            Div(
                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='ion ion-map'></i> {}</h3>".format(_('Qgis Project'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            'qgis_file',
                                            'form_id',
                                            'upload_url',
                                            'delete_url',
                                            css_class='box-body',

                                        ),
                                        css_class='box box-success'
                                    ),
                                    css_class='col-md-6'
                                ),

                                crispyBoxACL(self),
                                crispyBoxBaseLayer(self),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('Descrition data'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Field('description',css_class='wys5'),
                                            'thumbnail',
                                            css_class='box-body',

                                        ),
                                        css_class='box box-success'
                                    ),
                                    css_class='col-md-12'
                                ),


                                css_class='row'
                            )
        )

    class Meta:
        model = Project
        fields = (
            'qgis_file',
            'description',
            'thumbnail',
            'baselayer'
        )

        widgets = {
            '''
            'qgis_file': DropzoneInput(dropzone_config={
                'url': '/file-upload/',
                'maxFiles':1}
            )
            '''
        }



class QdjangoWidgetForm(QdjangoProjectFormMixin, G3WFormMixin, G3WGroupFormMixin, G3WRequestFormMixin, forms.ModelForm):
    """
    Form object for Qdjango widget model.
    """

    def __init__(self, *args, **kwargs):
        super(QdjangoWidgetForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                Div(
                    'widget_type',
                    css_class='col-md-4'
                ),
                Div(
                    'name',
                    css_class='col-md-8'
                ),
                css_class='row'
            ),
            'body'
        )


    class Meta:
        model = Widget
        fields = (
            'widget_type',
            'name',
            'body'
        )
        widgets = {
            'body': widgets.HiddenInput
        }