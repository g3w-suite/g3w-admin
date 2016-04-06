from .models import *
from .api.serializers import *

ITERNET_LAYERS = {
    'elemento_stradale': {
        'model': ElementoStradale,
        'clientVar': 'strade', # variable name for client
        'geoSerializer': ElementoStradaleGeoSerializer
    },
    'giunzione_stradale': {
        'model': GiunzioneStradale,
        'clientVar': 'giunzioni',  # variable name for client
        'geoSerializer': GiunzioneStradaleGeoSerializer
    },
    'accesso': {
        'model': Accesso,
        'clientVar': 'accessi',  # variable name for client
        'geoSerializer': AccessoGeoSerializer
    },

}