from django.db.models.fields import *
from django.db.models.fields.files import *
from copy import deepcopy
from collections import OrderedDict


# data field type
FIELD_TYPE_INTEGER = 'integer'
FIELD_TYPE_FLOAT = 'float'
FIELD_TYPE_STRING = 'string'
FIELD_TYPE_BOOLEAN = 'boolean'
FIELD_TYPE_DATE = 'date'
FIELD_TYPE_TIME = 'time'
FIELD_TYPE_DATETIME = 'datetime'
FIELD_TYPE_IMAGE = 'file'
FIELD_TYPE_FILE = 'file'


# form field type
FORM_FIELD_TYPE_TEXT = 'text'
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
    FIELD_TYPE_FLOAT: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_STRING: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_BOOLEAN: FORM_FIELD_TYPE_CHECK,
    FIELD_TYPE_DATE: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_TIME: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_DATETIME: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_IMAGE: FORM_FIELD_TYPE_IMAGE,
    FIELD_TYPE_FILE: FORM_FIELD_TYPE_FILE,
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

        # character types:
        'varchar': FIELD_TYPE_STRING,
        'character': FIELD_TYPE_STRING,
        'char': FIELD_TYPE_STRING,
        'text': FIELD_TYPE_STRING,

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
        FloatField: FIELD_TYPE_FLOAT,
        ImageField: FIELD_TYPE_IMAGE,
        FileField: FIELD_TYPE_FILE,
        DecimalField: FIELD_TYPE_FLOAT
    }
}


def editingFormField(fieldName, type=FIELD_TYPE_STRING, editable=True, required=False, validate={}, fieldLabel=None, inputType=None, values=None, **kwargs):
    """
    Build editign form field for client.
    """
    ret = OrderedDict({
        'name': fieldName,
        'type': type,
        'label': fieldLabel if fieldLabel else fieldName,
        'editable': editable,
        'validate': validate,
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
                    fieldLabel=field['label'],
                    inputType=FORM_FIELDS_MAPPING[field['type']]
                )

                if 'fields' in kwargs and field['name'] in kwargs['fields']:
                    formFields[field['name']].update(kwargs['fields'][field['name']])


    if formField:
        return formFields
    else:
        return fieldsMapped


def mapLayerAttributesFromModel(model, formField=False, **kwargs):
    """
    map model simple e direct field to Attributes for client editing system
    only concrete field not virtual field and many2many
    """
    fieldsToExlude = kwargs['fieldsToExlude'] if 'fieldsToExlude' in kwargs else []

    toRes = OrderedDict()
    fields = model._meta.concrete_fields
    for field in fields:
        if not isinstance(field, AutoField) and field.name not in fieldsToExlude:
            fieldType = FIELD_TYPES_MAPPING['djangoModel'][type(field)]
            toRes[field.name] = editingFormField(
                field.name,
                required=not field.blank,
                fieldLabel=field.attname,
                type=fieldType,
                inputType=FORM_FIELDS_MAPPING[fieldType]
            )
    return toRes



