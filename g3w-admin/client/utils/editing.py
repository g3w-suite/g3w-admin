from copy import deepcopy

FIELD_TYPES_MAPPING = {
    'postgres': {

        # numeric:
        'smallint': 'integer',
        'integer': 'integer',
        'bigint': 'integer',
        'decimal': 'float',
        'numeric': 'float',
        'real': 'float',
        'double precision': 'float',
        'serial': 'integer',
        'smallserial': 'float',
        'bigserial': 'float',

        # character types:
        'varchar': 'string',
        'character': 'string',
        'char': 'string',
        'text': 'string',

        # date and datetime
        'timestamp': 'datetime',
        'date': 'date',
        'time': 'time',
        'interval': 'time'
    },

    'ogr': {

        # numeric:
        'integer': 'integer',
        'real': 'real',

        # character types:
        'string': 'string',

        # date and datetime
        'datetime': 'datetime'
    },

    'default': {

        # numeric:
        'integer': 'integer',
        'real': 'real',

        # character types:
        'string': 'string',

        # date and datetime
        'datetime': 'datetime'
    }   

}


def editingFormField(fieldName, fieldLabel=None, inputType=None, values=None, **kwargs):
    """
    Build editign form field for client.
    """
    ret = {
        'name': fieldName,
        'label': fieldLabel if fieldLabel else fieldName,
        'inputType': inputType if inputType else 'text',
    }

    if 'default' in kwargs:
        ret['default'] = kwargs['default']

    if inputType == 'pick' and 'pickdata' in kwargs:
        ret['pickdata'] = kwargs['pickdata']

    if values:
        ret['values'] = values

    return ret


def mapLayerAttributes(layer):
    """
    Map database columnd data from layer by type for client editing
    """
    layer_type = getattr(layer, 'layer_type')
    mappingData = FIELD_TYPES_MAPPING.get(layer_type, FIELD_TYPES_MAPPING['default'])

    fields = eval(layer.database_columns)
    fieldsMapped = deepcopy(fields)
    
    for field in fieldsMapped:
        originType = field['type'].lower()
        type = originType[:originType.find('(')] if originType.find('(') >= 0 else originType
        if type in mappingData.keys():
            field['type'] = mappingData[type]

    return fieldsMapped

        

