from django import forms
from django.forms import ValidationError
from django.utils.translation import ugettext, ugettext_lazy as _
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import Div, Field, HTML
from core.mixins.forms import *
from usersmanage.forms import G3WACLForm
from django_file_form.forms import FileFormMixin, UploadedFileField
from .models import *
from usersmanage.utils import get_fields_by_user, crispyBoxACL
from dropzone.forms import DropzoneInput
from django.forms import TextInput


from qgis.core import QgsProject, QgsApplication
from PyQt4.QtCore import QFileInfo, QObject, SIGNAL
from .utils.data import QgisProject, ProjectExists


class QdjangoProjectFormMixin(object):
    """
    Mixin for project qdjango form, clean policy ofr qgisfile
    """
    def clean_qgis_file(self):
        try:
            qgis_file = self.cleaned_data['qgis_file']
            group = self.group
            self.qgisProject = QgisProject(qgis_file,group=group)
            if not self.instance:
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


class QdjangoProjetForm(QdjangoProjectFormMixin, G3WFormMixin, G3WGroupFormMixin, G3WRequestFormMixin, G3WACLForm, FileFormMixin, forms.ModelForm):

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
            'thumbnail'
        )
        '''
        widgets = {
            'qgis_file': DropzoneInput(dropzone_config={
                'url': '/file-upload/',
                'maxFiles':1}
            )
        }
        '''