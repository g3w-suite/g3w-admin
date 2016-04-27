from .models import *
from .ie.resources import *
from .api.serializers import *

ITERNET_LAYERS = {
    'elemento_stradale': {
        'model': ElementoStradale,
        'clientVar': 'strade', # variable name for client
        'geoSerializer': ElementoStradaleGeoSerializer,
        'geometryType': 'LineString',
        'toRet': ['cod_ele'],
        'relations': [
            {'model': ToponimoStradale, 'resource': ToponimoStradaleResource, 'dbfFileName': 'toponimo_stradale.dbf', 'fk': ['cod_top']},
        ],
        'metadatiInfo': [
            {'model': ArchiInfo, 'resource': ArchiInfoResource, 'dbfFileName': 'archi_info.dbf'},
            {'model': ToponimiInfo, 'resource': ToponimiInfoResource, 'dbfFileName': 'toponimi_info.dbf'}
        ]
    },
    'giunzione_stradale': {
        'model': GiunzioneStradale,
        'clientVar': 'giunzioni',  # variable name for client
        'geoSerializer': GiunzioneStradaleGeoSerializer,
        'geometryType': 'Point',
        'toRet': ['cod_gnz'],
        'metadatiInfo': [
            {'model': NodiInfo, 'resource': NodiInfoResource, 'dbfFileName': 'nodi_info.dbf'}
        ]
    },
    'accesso': {
        'model': Accesso,
        'clientVar': 'accessi',  # variable name for client
        'geoSerializer': AccessoGeoSerializer,
        'geometryType': 'Point',
        'relations': [
            {'model': NumeroCivico, 'resource': NumeroCivicoResource, 'dbfFileName': 'numero_civico.dbf', 'fk': ['cod_acc', 'tip_acc']},
        ],
        'metadatiInfo': [
            {'model': AccessiInfo, 'resource': AccessiInfoResource, 'dbfFileName': 'accessi_info.dbf'},
            {'model': CiviciInfo, 'resource': CiviciInfoResource, 'dbfFileName': 'civici_info.dbf'}
        ]
    },

}
