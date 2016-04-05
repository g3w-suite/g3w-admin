

def editingFormField(fieldName, fieldLabel=None, inputType=None, values=None):

    ret = {
        'name': fieldName,
        'label': fieldLabel if fieldLabel else fieldName,
        'inputType': inputType if inputType else 'text',
    }

    if values:
        ret['values'] = values

    return ret