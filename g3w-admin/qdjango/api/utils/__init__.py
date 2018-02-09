from core.utils.structure import RELATIONS_ONE_TO_ONE


def serialize_vectorjoin(layer_id, n, join):

    name = '{}_vectorjoin_{}'.format(layer_id, n)

    return {
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