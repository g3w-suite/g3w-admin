

class APIVectorLayerStructure(object):

    _format = 'GeoJSON'
    _pkField = 'gid'
    _data = None
    _featureLocks = None
    _errors = None
    _geomentryType = None
    _inputs = None

    def __init__(self, **kwargs):

        self.format = kwargs.get('type', self._format)
        self.pkField = kwargs.get('pkField', self._pkField)
        self.data = kwargs.get('data', self._data)
        self.featureLocks = kwargs.get('featureLocks', self._featureLocks)
        self.errors = kwargs.get('errors', self._errors)
        self.geometryType = kwargs.get('geomentryType', self._geomentryType)
        self.inputs = kwargs.get('inputs', self._inputs)

    def setPkField(self, pkField):
        self._pkField = pkField

    def setData(self, data):
        self._data = data

    def setFeatureLocks(self, featuresLock):
        self.featureLocks = featuresLock

    def setInputs(self, inputs):
        self.inputs = inputs

    def as_dict(self):

        return {
            'vector': {
                'format': self.format,
                'pk': self.pkField,
                'data': self.data,
                'geometrytype': self.geometryType,
                'inputs': self.inputs
            },
            'featurelocks': self.featureLocks,
            'errors': self.errors
        }



