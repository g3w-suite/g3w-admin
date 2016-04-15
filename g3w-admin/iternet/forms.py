from django.forms import ModelForm, ValidationError
from django.utils.translation import ugettext, ugettext_lazy as _
from django.conf import settings
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Submit, HTML, Button, Row, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from .models import Config
from .configs import ITERNET_LAYERS
import copy

iternet_connection = copy.copy(settings.DATABASES[settings.ITERNET_DATABASE])

class ConfigForm(ModelForm):

    def __init__(self, *args, **kwargs):
        super(ConfigForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                                Div(
                                    Div(
                                        Div(
                                            Div(
                                                HTML("<h3 class='box-title'><i class='fa fa-cog'></i> {}</h3>".format(
                                                    _('Data config'))),
                                                css_class='box-header with-border'
                                            ),
                                            Div(
                                                'project',
                                                css_class='box-body',

                                            ),
                                            css_class='box box-success'
                                        ),
                                        css_class='col-md-12'
                                    ),
                                    css_class='row'
                                )
        )

    def clean_project(self):

        project = self.cleaned_data['project']

        # check for layer name right in to project
        layers = project.layer_set.all()
        layerNames = {l.name:l for l in layers}
        layerNamesNotInProject = set(ITERNET_LAYERS.keys()) - set(layerNames.keys())
        if layerNamesNotInProject:
            raise ValidationError(_('Project not correct: {} layers no in project'.format(', '.join(layerNamesNotInProject))))

        # check for datasoruce
        # build layer data source model
        '''
        for l, dl in ITERNET_LAYERS.items():
            # dbname='iternet_capannori' host=localhost port=5432 user='postgres' password='postgres' sslmode=disable key='gid' srid=3003 type=MultiPolygon table="public"."limite_comunale" (the_geom) sql=
            dataSourceString = "dbname='{}' host={} port={} user='{}' password='{}' sslmode=disable key='{}' srid={} type={} table=\"public\".\"{}\" (the_geom) sql=".format(
                iternet_connection['NAME'],
                iternet_connection['HOST'],
                iternet_connection['PORT'],
                iternet_connection['USER'],
                iternet_connection['PASSWORD'],
                'gid',
                settings.ITERNET_DATA_SRID,
                dl['geometryType'],
                dl['model']._meta.db_table
            )
            if layerNames[l].datasource != dataSourceString:
                raise ValidationError(_('Project layer {} datasource no correct'.format(l)))
        '''



        return project

    class Meta:
        model = Config
        fields = '__all__'
