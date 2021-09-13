from core.utils.structure import RELATIONS_ONE_TO_ONE


def serialize_vectorjoin(layer_id, n, join):
    """Return layer vectorjoin data for g3w-client"""

    name = '{}_vectorjoin_{}'.format(layer_id, n)

    ret = {
        'type': RELATIONS_ONE_TO_ONE,
        'id': name,
        'name': name,
        'referencedLayer': layer_id,
        'referencingLayer': join['joinLayerId'],
        'fieldRef': {
            'referencedField': join['targetFieldName'],
            'referencingField': join['joinFieldName']
        }
    }

    # if 'customPrefix' is set:
    if 'customPrefix' in join:
        ret['customPrefix'] = join['customPrefix']

    return ret

