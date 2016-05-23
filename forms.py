from django.forms import ModelForm, Form, ChoiceField, MultipleChoiceField, CheckboxSelectMultiple, CharField
from django.utils.translation import ugettext, ugettext_lazy as _
from django_file_form.forms import FileFormMixin
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, HTML, Field
from django_file_form.forms import UploadedFileField
from usersmanage.utils import get_fields_by_user, crispyBoxACL
from usersmanage.forms import G3WACLForm
from core.mixins.forms import *
from core.utils import unicode2ascii
from usersmanage.configs import *
from .models import Configs, Layer
import json

class cduFormMixin(object):

    def getChoicesFields(self,layer):
        fields = []
        database_columns = json.loads(layer.database_columns)
        for f in database_columns:
            fields.append((f['name'],"{} ({})".format(f['name'],f['type'])))
        return fields


class cduConfigInitForm(G3WFormMixin, G3WRequestFormMixin, G3WACLForm, ModelForm):
    """
    Form with title description Project map file and file template ODT
    """
    #odtfile = UploadedFileField()

    viewer_groups = (G3W_VIEWER1, )

    def __init__(self,*args,**kwargs):
        self._init_users(**kwargs)
        super(cduConfigInitForm,self).__init__(*args,**kwargs)
        # change ows_user field label
        self.fields['viewer_users'].label = _('User users')
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
                            Field('project', css_class='select2'),
                            'odtfile',
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


class cduConfigCatastoLayerForm(Form):
    """
    Form for selection of catasto layer and against layers
    """

    catastoLayer = ChoiceField(label=_('Cadastre layer'), initial=10)
    againstLayers = MultipleChoiceField(widget=CheckboxSelectMultiple())

    def __init__(self,*args, **kwargs):

        #fill catastoLayer choices
        self.project = kwargs.get('project',None)
        if self.project:
            kwargs.pop('project')
        super(cduConfigCatastoLayerForm,self).__init__(*args,**kwargs)
        layers = Layer.objects.filter(project=self.project).values_list('id','name')

        self.fields['catastoLayer'].choices = [(None,'------')] + list(layers)
        self.fields['againstLayers'].choices = list(layers)

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                _('CDU layers choice'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Field('catastoLayer', css_class='select2'),
                            'againstLayers',
                            css_class='box-body',

                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                ),
                css_class='row'
            )
        )


class cduCatastoLayerFieldsForm(Form, cduFormMixin):
    """
    Form for select catasto fields and set against alias layers
    """
    foglio = ChoiceField(label=_('Sheet'), choices=())
    particella = ChoiceField(label=_('Parcel'), choices=())
    plusFieldsCatasto = MultipleChoiceField(label=_('Plus fields'), choices=(), required=False)

    def __init__(self, *args, **kwargs):
        self.catastoLayerFormData = kwargs.get('catastoLayerFormData', None)
        if self.catastoLayerFormData:
            kwargs.pop('catastoLayerFormData')
        super(cduCatastoLayerFieldsForm,self).__init__(*args, **kwargs)

        # get fields of catasto
        self._setFieldsCatasto()
        self._setPlusFieldsCatasto();
        self._setAliasLayers()

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                _('CDU Catasto fields'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Field('foglio', css_class='select2'),
                            Field('particella', css_class='select2'),
                            'plusFieldsCatasto',
                            css_class='box-body',

                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                ),

                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                _('CDU Against layers aliases'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            *self.fieldsAliasLayers,
                            css_class='box-body'
                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                ),
                css_class='row'
            ),
        )

    def _setFieldsCatasto(self):
        """
        Get layers from project and builds select for 'particella' and 'foglio' field
        """
        self.catastoLayer = Layer.objects.get(pk=self.catastoLayerFormData['catastoLayer'])

        # get fields for foglio and particelle from database_columns
        self.fields['particella'].choices = self.fields['foglio'].choices = self.getChoicesFields(self.catastoLayer)

    def _setPlusFieldsCatasto(self):
        """
        Set fields from catasto layer to use in template and results.
        """
        # get fields for PlusFields
        self.fields['plusFieldsCatasto'].choices = self.getChoicesFields(self.catastoLayer)

    def _setAliasLayers(self):
        """
        Set alias for catasto lasyer and other agaiint layers to show in results and template odt.
        """
        againstLayers = self.catastoLayerFormData['againstLayers']
        layers = Layer.objects.filter(pk__in=againstLayers)
        self.fieldsAliasLayers = []
        for layer in layers:
            fieldName = unicode2ascii(layer.name)
            self.fieldsAliasLayers.append(fieldName)
            self.fields[fieldName] = CharField(label=layer.name, max_length=200,required=False)


class cduAgainstLayerFieldsForm(Form,cduFormMixin):
    """
    Form to select against fields to show in results
    """
    def __init__(self,*args,**kwargs):
        self.catastoLayerFormData = kwargs.get('catastoLayerFormData',None)
        if self.catastoLayerFormData:
            kwargs.pop('catastoLayerFormData')
        self.catastoLayerFieldsFormData = kwargs.get('catastoLayerFieldsFormData',None)
        if self.catastoLayerFieldsFormData:
            kwargs.pop('catastoLayerFieldsFormData')
        super(cduAgainstLayerFieldsForm,self).__init__(*args,**kwargs)

        # set fields of catasto
        self._setAliasPlusFieldsCatasto()
        self._setFieldsAgainstLayers()

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        layoutElements = []

        if len(self.fieldsAliasPlusFieldsCatasto):
            layoutElements.append(
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                _('CDU Optional fields catasto aliases'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            *self.fieldsAliasPlusFieldsCatasto,
                            css_class='box-body'
                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                )
            )

        layoutElements.append(
            Div(
                Div(
                    Div(
                        HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                            _('CDU Against layer fields to show in results'))),
                        css_class='box-header with-border'
                    ),
                    Div(
                        *self.fieldsFieldsAliasLayers,
                        css_class='box-body'
                    ),
                    css_class='box box-success'
                ),
                css_class='col-md-12'
            ),
        )

        self.helper.layout = Layout(
            Div(
                *layoutElements,
                css_class='row'
            )
        )



    def _setFieldsAgainstLayers(self):
        """
        Set fields against layer choice.
        """
        againstLayers = self.catastoLayerFormData['againstLayers']
        layers = Layer.objects.filter(pk__in=againstLayers)
        self.fieldsFieldsAliasLayers = []
        for layer in layers:
            fieldName = unicode2ascii(layer.name)
            self.fieldsFieldsAliasLayers.append(fieldName)
            self.fields[fieldName] = MultipleChoiceField(label=layer.name,choices=self.getChoicesFields(layer))

    def _setAliasPlusFieldsCatasto(self):
        """
        Set charfields for alias plus field catasto.
        """
        self.fieldsAliasPlusFieldsCatasto = []
        for f in self.catastoLayerFieldsFormData['plusFieldsCatasto']:
            fieldName = unicode2ascii('plusFieldsCatasto_{}'.format(f))
            self.fields[fieldName] = CharField(label=f.capitalize,max_length=100)
            self.fieldsAliasPlusFieldsCatasto.append(fieldName)


class cduAgainstLayerFieldsAliasForm(Form, cduFormMixin):
    """
    Form to set Against fields alias values
    """
    def __init__(self,*args,**kwargs):
        self.catastoLayerFieldsFormData = kwargs.get('catastoLayerFieldsFormData',None)
        self.againstLayerFieldFormData = kwargs.get('againstLayerFieldFormData',None)
        if self.catastoLayerFieldsFormData:
            kwargs.pop('catastoLayerFieldsFormData')
        if self.againstLayerFieldFormData:
            kwargs.pop('againstLayerFieldFormData')
        super(cduAgainstLayerFieldsAliasForm,self).__init__(*args,**kwargs)

        self._setFieldsAliasFieldsLayers()

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        self._setLayout()

    def _setLayout(self):
        # build of singular Div cryspiform instance for every layers fild
        args = []
        for formDataKey, formField in self.fieldsByLayers.items():
            args.append(
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                _('CDU Alias for against field <i>{}</i>'.format(self.againstLayerAlias[formDataKey])))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            *formField,
                            css_class='box-body'
                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                )
            )

        self.helper.layout = Layout(
            Div(*args, css_class='row')
        )

    def _setFieldsAliasFieldsLayers(self):
        """
        Create character fields for against layer fields selected uin previus form.
        """

        self.fieldsByLayers = {}
        self.againstLayerAlias = {}
        for formDataKey, formDataValue in self.againstLayerFieldFormData.items():
            if not formDataKey.startswith('plusFieldsCatasto'):
                fields = []
                for fieldName in formDataValue:
                    fname = unicode2ascii(fieldName)
                    fields.append(fname)
                    self.fields[fieldName] = CharField(max_length=100)
                self.fieldsByLayers[formDataKey] = fields
                self.againstLayerAlias[formDataKey] = self.catastoLayerFieldsFormData[formDataKey]