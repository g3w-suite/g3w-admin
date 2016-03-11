from django import forms
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

class QdjangoProjectFormMixin(object):
    """
    Mixin for project qdjango form, clean policy ofr qgisfile
    """

    def error(self,msg):
        print msg


    def clean_qgis_file(self):
        try:

            #load here because at global level problem on loggin system
            '''
            qgis_file = self.cleaned_data['qgis_file']
            project  = QgsProject.instance()
            #QObject.connect(project, SIGNAL("loadingLayer(QString)"), self.error)
            #project.read(QFileInfo(qgis_file.file.path))
            project.read(QFileInfo('/home/www/django-qgis-static/media/projects/cdu_cdu.qgs'))

            print 'pippo'

            '''
            qgis_file = self.cleaned_data['qgis_file']
            qgis_project_data = get_qgis_data(qgis_file)
            qgis_project_title = qgis_project_data['title']
            # Check group and project have same SRID and units
            if hasattr(self, 'instance'):
                group = self.instance.group
            else:
                group = self.group
            is_group_compatible(group, qgis_project_data)

        except Exception as e:
            print e
            #raise ValidationError(e)
        '''
        project_exists = Project.objects.filter(title=qgis_project_title).exists()
        if not isinstance(self, ProjectUpdateForm) and project_exists:
            raise ValidationError(_('A project with the same title already exists'))
        self.qgis_project_data = qgis_project_data
        '''
        return qgis_file

class QdjangocProjetForm(QdjangoProjectFormMixin, G3WFormMixin, G3WRequestFormMixin, G3WACLForm, FileFormMixin,forms.ModelForm):

    qgis_file = UploadedFileField(required=True)
    thumbnail = UploadedFileField()

    def __init__(self, *args, **kwargs):
        super(QdjangocProjetForm, self).__init__(*args, **kwargs)
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