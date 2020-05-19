from django.db.models.fields import *
from django.db.models.fields.files import *
from django.db.models.fields.related import *
import django.contrib.gis.db.models as geomodels
from sqlalchemy.sql import sqltypes as SQLTYPE


# specific from dialectics
from sqlalchemy.dialects.postgresql import base as SQLPOSTGRESTYPE
import geoalchemy2.types as geotypes
from django.conf import settings
from django.apps import apps
from django.urls import reverse
from django.utils.translation import ugettext, ugettext_lazy as _
from collections import OrderedDict
import copy

from qgis.core import QgsFieldConstraints
from qgis.PyQt.QtCore import QVariant

# Mapping OGRwkbGeometryType
MAPPING_OGRWKBGTYPE = {
    0: 'No Geometry',
    1: 'Point',
    2: 'LineString',
    3: 'Polygon',
    4: 'MultiPoint',
    5: 'MultiLineString',
    6: 'MultiPolygon',
    7: 'Geometry'
}

# relations data type
RELATIONS_ONE_TO_ONE = 'ONE'
RELATIONS_ONE_TO_MANY = 'MANY'

# namespace to add 'private' properties to geojson data
RELATIONS_NAMESPACE = 'g3w_'

# data field type for client
# ==========================
FIELD_TYPE_INTEGER = 'integer'
FIELD_TYPE_BIGINTEGER = 'bigint'
FIELD_TYPE_SMALLINTEGER = 'integer'
FIELD_TYPE_FLOAT = 'float'
FIELD_TYPE_STRING = 'string'
FIELD_TYPE_TEXT = 'text'
FIELD_TYPE_BOOLEAN = 'boolean'
FIELD_TYPE_DATE = 'date'
FIELD_TYPE_TIME = 'time'
FIELD_TYPE_DATETIME = 'datetime'
FIELD_TYPE_IMAGE = 'image'
FIELD_TYPE_FILE = 'file'
FIELD_TYPE_VARCHAR = 'varchar'
FIELD_TYPE_CHAR = 'char'

# form field type for editing and forms in general
# ================================================
FORM_FIELD_TYPE_TEXT = 'text'
FORM_FIELD_TYPE_TEXTAREA = 'textarea'
FORM_FIELD_TYPE_SELECT = 'select'
FORM_FIELD_TYPE_SELECT_AUTOCOMPLETE = 'select_autocomplete'
FORM_FIELD_TYPE_CHECK = 'check'
FORM_FIELD_TYPE_RADIO = 'radio'
FORM_FIELD_TYPE_COORDSPICKER = 'coordspicker'
FORM_FIELD_TYPE_BOXPICKER = 'boxspicker'
FORM_FIELD_TYPE_LAYERPICKER = 'layerpicker'
FORM_FIELD_TYPE_FIELDDEPEND = 'fielddepend'
FORM_FIELD_TYPE_IMAGE = 'image'
FORM_FIELD_TYPE_FILE = 'file'
FORM_FIELD_TYPE_FLOAT = 'float'


# mapping between form fields and fields data types
# =================================================
FORM_FIELDS_MAPPING = {
    FIELD_TYPE_INTEGER: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_BIGINTEGER: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_FLOAT: FORM_FIELD_TYPE_FLOAT,
    FIELD_TYPE_STRING: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_TEXT: FORM_FIELD_TYPE_TEXTAREA,
    FIELD_TYPE_VARCHAR: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_CHAR: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_BOOLEAN: FORM_FIELD_TYPE_RADIO,
    FIELD_TYPE_DATE: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_TIME: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_DATETIME: FORM_FIELD_TYPE_TEXT,
    FIELD_TYPE_IMAGE: FORM_FIELD_TYPE_IMAGE,
    FIELD_TYPE_FILE: FORM_FIELD_TYPE_FILE,
}

# todo: to remove
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
    SQLTYPE.TIMESTAMP: DateTimeField,

    # specific for postgres
    SQLPOSTGRESTYPE.DOUBLE_PRECISION: FloatField,
    SQLPOSTGRESTYPE.TIMESTAMP: DateTimeField,
    SQLPOSTGRESTYPE.BYTEA: BinaryField,
    geotypes.Geometry: geomodels.GeometryField,
    'geotype': geomodels.GeometryField,
    'autoincrement': AutoField
}


FIELD_TYPES_MAPPING = {
    'BOOL': FIELD_TYPE_BOOLEAN,
    'INT': FIELD_TYPE_INTEGER,
    'UINT': FIELD_TYPE_INTEGER,
    'QLONGLONG': FIELD_TYPE_BIGINTEGER,
    'QULONGLONG': FIELD_TYPE_BIGINTEGER,
    'DOUBLE': FIELD_TYPE_FLOAT,
    'QCHAR': FIELD_TYPE_CHAR,
    'QSTRING': FIELD_TYPE_VARCHAR,
    'QDATE': FIELD_TYPE_DATE,
    'QTIME': FIELD_TYPE_TIME,
    'QDATETIME': FIELD_TYPE_DATETIME,
    'QURL': FIELD_TYPE_VARCHAR,
    'LONG': FIELD_TYPE_FLOAT,
    'SHORT': FIELD_TYPE_FLOAT,
    'CHAR': FIELD_TYPE_CHAR,
    'ULONG': FIELD_TYPE_FLOAT,
    'USHORT': FIELD_TYPE_FLOAT,
    'UCHAR': FIELD_TYPE_CHAR,
    'FLOAT': FIELD_TYPE_FLOAT
}


def editingFormField(fieldName, type=FIELD_TYPE_STRING, editable=True, required=False, validate=None,
                     fieldLabel=None, inputType=None, values=None, default_clause='', not_null=False, unique=False, **kwargs):
    """
    Build editing form field for client.
    """

    ret = OrderedDict({
        'name': fieldName,
        'type': type,
        'label': fieldLabel if fieldLabel else fieldName,
        'editable': editable,
        'validate': {} if not validate else validate,
        'default': default_clause,
        'not_null': not_null,
        'unique': unique,
        'input': {
            'type': inputType if inputType else FORM_FIELD_TYPE_TEXT,
            'options': {}
        },
    })

    if required:
        ret['validate']['required'] = True

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

    mappingData = FIELD_TYPES_MAPPING

    fields = eval(layer.database_columns) if layer.database_columns else None
    fieldsMapped = copy.deepcopy(fields)

    # exclude if set:
    if 'exclude' in kwargs:
        _fieldsMapped = []
        for field in fieldsMapped:
            if field['name'] not in kwargs['exclude']:
                _fieldsMapped.append(field)
        fieldsMapped = _fieldsMapped

    if formField:
        formFields = OrderedDict()

    for field in fieldsMapped:
        originType = field['type']
        type = originType[:originType.find('(')] if originType.find(
            '(') >= 0 else originType
        if type in list(mappingData.keys()):
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
                    deepupdate(formFields[field['name']],
                               kwargs['fields'][field['name']])

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


def mapLayerAttributesFromQgisLayer(qgis_layer, **kwargs):
    """
    map QGIS layer's simple and direct field to Attributes for client editing system
    only concrete field not virtual field and many2many
    """

    fieldsToExclude = kwargs['fieldsToExclude'] if 'fieldsToExclude' in kwargs else [
    ]

    toRes = OrderedDict()
    fields = qgis_layer.fields()

    data_provider = qgis_layer.dataProvider()

    # exclude if set:
    if 'exclude' in kwargs:
        _fieldsMapped = []
        for field in fields:
            if field.name not in kwargs['exclude']:
                _fieldsMapped.append(field)
        fields = _fieldsMapped

    field_index = 0
    for field in fields:
        if field.name() not in fieldsToExclude:
            #internal_typename = field.typeName().split('(')[0]
            internal_typename = QVariant.typeToName(field.type()).upper()
            if internal_typename in FIELD_TYPES_MAPPING:

                # Get constraints and default clause to define if the field is editable
                # or set editable property by kwargs.
                # Only consider "strong" constraints
                constraints = data_provider.fieldConstraints(field_index)
                not_null = bool(constraints & QgsFieldConstraints.ConstraintNotNull) and \
                    field.constraints().constraintStrength(
                        QgsFieldConstraints.ConstraintNotNull) == QgsFieldConstraints.ConstraintStrengthHard
                unique = bool(constraints & QgsFieldConstraints.ConstraintUnique) and \
                    field.constraints().constraintStrength(
                        QgsFieldConstraints.ConstraintUnique) == QgsFieldConstraints.ConstraintStrengthHard
                default_clause = data_provider.defaultValueClause(field_index)

                if not_null and unique and default_clause:
                    editable = False
                else:
                    editable = kwargs['fields'][field.name()]['editable']

                # remove editable from kwargs:
                del(kwargs['fields'][field.name()]['editable'])

                comment = field.comment() if field.comment() else field.name()
                fieldType = FIELD_TYPES_MAPPING[internal_typename]
                toRes[field.name()] = editingFormField(
                    field.name(),
                    required=not_null,
                    fieldLabel=comment,
                    type=fieldType,
                    inputType=FORM_FIELDS_MAPPING[fieldType],
                    editable=editable,
                    default_clause=default_clause,
                    not_null=not_null,
                    unique=unique
                )

                # add upload url to image type if module is set
                if 'editing' in settings.G3WADMIN_LOCAL_MORE_APPS:
                    if fieldType == FIELD_TYPE_IMAGE:
                        toRes[field.name()].update({
                            'uploadurl': reverse('editing-upload')
                        })
                    if fieldType == FIELD_TYPE_BOOLEAN:
                        toRes[field.name()]['input']['options'].update({
                            'values': [{'key': _('Yes'), 'value': True}, {'key': 'No', 'value': False}]
                        })

                # update with fields configs data
                if 'fields' in kwargs and field.name() in kwargs['fields']:
                    deepupdate(toRes[field.name()],
                               kwargs['fields'][field.name()])

        field_index += 1

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


class APIVectorLayerStructure(object):
    """
    Structure for API Vector Layer response.
    """

    _format = 'GeoJSON'
    _data = None
    _featureLocks = None
    _geometryType = None
    _fields = None

    def __init__(self, **kwargs):

        self.format = kwargs.get('type', self._format)
        self.count = kwargs.get('count', None)
        self.data = kwargs.get('data', self._data)
        self.featureLocks = kwargs.get('featureLocks', self._featureLocks)
        self.geometryType = kwargs.get('geometryType', self._geometryType)
        self.fields = kwargs.get('fields', self._fields)

    def setPkField(self, pkField):
        self._pkField = pkField

    def setData(self, data):
        self._data = data

    def setFeatureLocks(self, featuresLock):
        self.featureLocks = featuresLock

    def setFields(self, fields):
        self.fields = fields

    def as_dict(self):

        res = {
            'vector': {
                'format': self.format,
                'count': self.count,
                'data': self.data,
                'geometrytype': self.geometryType,
                'fields': self.fields,
            },
            'featurelocks': self.featureLocks,
        }

        return res


# Copyright Ferry Boender, released under the MIT license.
def deepupdate(target, src):
    """Deep update target dict with src
    For each k,v in src: if k doesn't exist in target, it is deep copied from
    src to target. Otherwise, if v is a list, target[k] is extended with
    src[k]. If v is a set, target[k] is updated with v, If v is a dict,
    recursively deep-update it.

    Examples:
    >>> t = {'name': 'Ferry', 'hobbies': ['programming', 'sci-fi']}
    >>> deepupdate(t, {'hobbies': ['gaming']})
    >>> print t
    {'name': 'Ferry', 'hobbies': ['programming', 'sci-fi', 'gaming']}
    """
    for k, v in list(src.items()):
        if type(v) == list:
            if not k in target:
                target[k] = copy.deepcopy(v)
            else:
                target[k].extend(v)
        elif type(v) == dict:
            if not k in target:
                target[k] = copy.deepcopy(v)
            else:
                deepupdate(target[k], v)
        elif type(v) == set:
            if not k in target:
                target[k] = v.copy()
            else:
                target[k].update(v.copy())
        else:
            target[k] = copy.copy(v)
