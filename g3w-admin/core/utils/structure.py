from django.db.models.fields import *
from django.db.models.fields.files import *
from django.db.models.fields.related import *
import django.contrib.gis.db.models as geomodels
from sqlalchemy.sql import sqltypes as SQLTYPE

# specific fro dialectics
from sqlalchemy.dialects.postgresql import base as SQLPOSTGRESTYPE
import geoalchemy2.types as geotypes
from django.conf import settings
from django.apps import apps
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext, ugettext_lazy as _
from copy import deepcopy
from collections import OrderedDict

# relations data type
RELATIONS_ONE_TO_ONE = 'ONE'
RELATIONS_ONE_TO_MANY = 'MANY'

# namespace to add 'private' properties to geojson data
RELATIONS_NAMESPACE = 'g3w_'

# data field type
FIELD_TYPE_INTEGER = 'integer'
FIELD_TYPE_BIGINTEGER = 'integer'
FIELD_TYPE_FLOAT = 'float'
FIELD_TYPE_STRING = 'string'
FIELD_TYPE_TEXT = 'text'
FIELD_TYPE_BOOLEAN = 'boolean'
FIELD_TYPE_DATE = 'date'
FIELD_TYPE_TIME = 'time'
FIELD_TYPE_DATETIME = 'datetime'
FIELD_TYPE_IMAGE = 'image'
FIELD_TYPE_FILE = 'file'


# form field type
FORM_FIELD_TYPE_TEXT = 'text'
FORM_FIELD_TYPE_TEXTAREA = 'textarea'
FORM_FIELD_TYPE_SELECT = 'select'
FORM_FIELD_TYPE_CHECK = 'check'
FORM_FIELD_TYPE_RADIO = 'radio'
FORM_FIELD_TYPE_COORDSPICKER = 'coordspicker'
FORM_FIELD_TYPE_BOXPICKER = 'boxspicker'
FORM_FIELD_TYPE_LAYERPICKER = 'layerpicker'
FORM_FIELD_TYPE_FIELDDEPEND = 'fielddepend'
FORM_FIELD_TYPE_IMAGE = 'image'
FORM_FIELD_TYPE_FILE = 'file'


# mapping between form fields and fields data types
FORM_FIELDS_MAPPING = {
    FIELD_TYPE_INTEGER: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_BIGINTEGER: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_FLOAT: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_STRING: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_TEXT: FORM_FIELD_TYPE_TEXTAREA,
    FIELD_TYPE_BOOLEAN: FORM_FIELD_TYPE_RADIO,
    FIELD_TYPE_DATE: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_TIME: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_DATETIME: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_IMAGE: FORM_FIELD_TYPE_IMAGE,
    FIELD_TYPE_FILE: FORM_FIELD_TYPE_FILE,
}

MAPPING_GEOALCHEMY_DJANGO_FIELDS = {
    SQLTYPE.INTEGER: IntegerField,
    SQLTYPE.BIGINT: BigIntegerField,
    SQLTYPE.FLOAT: FloatField,
    SQLTYPE.VARCHAR: CharField,
    SQLTYPE.TEXT: TextField,
    SQLTYPE.SMALLINT: SmallIntegerField,
    SQLTYPE.BOOLEAN: BooleanField,
    SQLTYPE.DATE: DateField,
    SQLTYPE.DATETIME: DateTimeField,
    SQLTYPE.REAL: FloatField,
    SQLTYPE.CHAR: CharField,
    SQLTYPE.NUMERIC: DecimalField,
    SQLTYPE.BLOB: BinaryField,

    # specific for postgres
    SQLPOSTGRESTYPE.DOUBLE_PRECISION: FloatField,
    geotypes.Geometry: geomodels.GeometryField,
    'geotype': geomodels.GeometryField,
    'autoincrement': AutoField
}


FIELD_TYPES_MAPPING = {
    'postgres': {

        # numeric:
        'smallint': FIELD_TYPE_INTEGER,
        'integer': FIELD_TYPE_INTEGER,
        'bigint': FIELD_TYPE_INTEGER,
        'decimal': FIELD_TYPE_FLOAT,
        'numeric': FIELD_TYPE_FLOAT,
        'real': FIELD_TYPE_FLOAT,
        'double precision': FIELD_TYPE_FLOAT,
        'serial': FIELD_TYPE_INTEGER,
        'smallserial': FIELD_TYPE_FLOAT,
        'bigserial': FIELD_TYPE_FLOAT,
        'boolean': FIELD_TYPE_BOOLEAN,

        # character types:
        'varchar': FIELD_TYPE_STRING,
        'character': FIELD_TYPE_STRING,
        'char': FIELD_TYPE_STRING,
        'text': FIELD_TYPE_TEXT,

        # date and datetime
        'timestamp': FIELD_TYPE_DATETIME,
        FIELD_TYPE_DATE: FIELD_TYPE_DATE,
        FIELD_TYPE_TIME: FIELD_TYPE_TIME,
        'interval': FIELD_TYPE_TIME
    },

    'ogr': {

        # numeric:
        'integer': FIELD_TYPE_INTEGER,
        'real': 'real',

        # character types:
        'string': FIELD_TYPE_STRING,

        # date and datetime
        'string': FIELD_TYPE_DATETIME
    },

    'spatialite': {
        'integer': FIELD_TYPE_INTEGER,
        'text': FIELD_TYPE_TEXT,
        'real': FIELD_TYPE_FLOAT,
        'numeric': FIELD_TYPE_FLOAT,
    },

    'default': {

        # numeric:
        'integer': FIELD_TYPE_INTEGER,
        'real': 'real',

        # character types:
        'string': FIELD_TYPE_STRING,

        # date and datetime
        'string': FIELD_TYPE_DATETIME
    },

    'djangoModel': {
        CharField: FIELD_TYPE_STRING,
        BooleanField: FIELD_TYPE_BOOLEAN,
        TextField: FIELD_TYPE_STRING,
        URLField: FIELD_TYPE_STRING,
        IntegerField: FIELD_TYPE_INTEGER,
        BigIntegerField: FIELD_TYPE_BIGINTEGER,
        FloatField: FIELD_TYPE_FLOAT,
        ImageField: FIELD_TYPE_IMAGE,
        FileField: FIELD_TYPE_FILE,
        DecimalField: FIELD_TYPE_FLOAT,
        TextField: FIELD_TYPE_TEXT,
        ForeignKey: FIELD_TYPE_INTEGER, # is not correct
        AutoField: FIELD_TYPE_INTEGER,
        #BigAutoField: FIELD_TYPE_BIGINTEGER,
        NullBooleanField: FIELD_TYPE_BOOLEAN
    }
}


def editingFormField(fieldName, type=FIELD_TYPE_STRING, editable=True, required=False, validate=None,
                     fieldLabel=None, inputType=None, values=None, **kwargs):
    """
    Build editign form field for client.
    """
    ret = OrderedDict({
        'name': fieldName,
        'type': type,
        'label': fieldLabel if fieldLabel else fieldName,
        'editable': editable,
        'validate': {} if not validate else validate,
        'input': {
            'type': inputType if inputType else FORM_FIELD_TYPE_TEXT,
            'options': {}
        },
    })

    if required:
        ret['validate']['required'] = True;

    if 'default' in kwargs:
        ret['input']['options']['default'] = kwargs['default']

    if inputType in (FORM_FIELD_TYPE_LAYERPICKER, ) and 'pickerdata' in kwargs:
        ret['input']['options'] = kwargs['pickerdata']

    if values:
        ret['input']['options']['values'] = values

    return ret


def mapLayerAttributes(layer, formField=False, **kwargs):
    """
    Map database columns data from layer by type for client editing
    """
    layer_type = getattr(layer, 'layer_type')
    mappingData = FIELD_TYPES_MAPPING.get(layer_type, FIELD_TYPES_MAPPING['default'])

    fields = eval(layer.database_columns) if layer.database_columns else None
    fieldsMapped = deepcopy(fields)

    # exlude if set:
    if 'exlude' in kwargs:
        _fieldsMapped = []
        for field in fieldsMapped:
            if field['name'] not in kwargs['exlude']:
                _fieldsMapped.append(field)
        fieldsMapped = _fieldsMapped

    if formField:
        formFields = OrderedDict()

    for field in fieldsMapped:
        originType = field['type'].lower()
        type = originType[:originType.find('(')] if originType.find('(') >= 0 else originType
        if type in mappingData.keys():
            field['type'] = mappingData[type]
            if formField:
                formFields[field['name']] = editingFormField(
                    field['name'],
                    type=field['type'],
                    fieldLabel=field['label'] if field['label'] != '' else field['name'],
                    inputType=FORM_FIELDS_MAPPING[field['type']]
                )

                # add upload url to image type if module is set
                if 'editing' in settings.G3WADMIN_LOCAL_MORE_APPS:
                    if field['type'] == FIELD_TYPE_IMAGE:
                        formFields[field['name']].update({
                            'uploadurl': reverse('editing-upload')
                        })

                    if field['type'] == FIELD_TYPE_BOOLEAN:
                        formFields[field['name']]['input']['options'].update({
                             'values': [{'key': _('Yes'), 'value': True}, {'key': 'No', 'value': False}]
                        })

                # update with fields configs data
                if 'fields' in kwargs and field['name'] in kwargs['fields']:
                    formFields[field['name']].update(kwargs['fields'][field['name']])

    # reorder if is set in kwargs
    if 'order' in kwargs:
        orederedFormFields = OrderedDict()
        for lname in kwargs['order']:
            if lname in formFields:
                orederedFormFields[lname] = formFields[lname]
        formFields = orederedFormFields

    if formField:
        return formFields
    else:
        return fieldsMapped


def mapLayerAttributesFromModel(model, **kwargs):
    """
    map model simple e direct field to Attributes for client editing system
    only concrete field not virtual field and many2many
    """
    fieldsToExlude = kwargs['fieldsToExlude'] if 'fieldsToExlude' in kwargs else []

    toRes = OrderedDict()
    fields = model._meta.concrete_fields

    # exlude if set:
    if 'exlude' in kwargs:
        _fieldsMapped = []
        for field in fields:
            if field.name not in kwargs['exlude']:
                _fieldsMapped.append(field)
        fields = _fieldsMapped

    for field in fields:
        #not isinstance(field, AutoField) and
        if field.name not in fieldsToExlude:
            if type(field) in FIELD_TYPES_MAPPING['djangoModel']:
                fieldType = FIELD_TYPES_MAPPING['djangoModel'][type(field)]
                toRes[field.name] = editingFormField(
                    field.name,
                    required=not field.blank,
                    fieldLabel=field.verbose_name if field.verbose_name else field.attname,
                    type=fieldType,
                    inputType=FORM_FIELDS_MAPPING[fieldType],
                    editable=not (field==model._meta.pk and type(field) in (AutoField,))
                )

                # add upload url to image type if module is set
                if 'editing' in settings.G3WADMIN_LOCAL_MORE_APPS:
                    if fieldType == FIELD_TYPE_IMAGE:
                        toRes[field.name].update({
                            'uploadurl': reverse('editing-upload')
                        })
                    if fieldType == FIELD_TYPE_BOOLEAN:
                        toRes[field.name]['input']['options'].update({
                            'values': [{'key': _('Yes'), 'value': True}, {'key': 'No', 'value': False}]
                        })

                # update with fields configs data
                if 'fields' in kwargs and field.name in kwargs['fields']:
                    toRes[field.name].update(kwargs['fields'][field.name])
    return toRes


def getProjectsByGroup(group):
    """
    Return queryset projects for groups for every project app
    """
    ret = {}
    for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
        Project = apps.get_app_config(g3wProjectApp).get_model('project')
        ret[g3wProjectApp] = Project.objects.filter(group=group)
    return ret