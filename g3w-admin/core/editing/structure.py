

class VectorLayerStructure(object):

    _type = 'GeoJSON'
    _pkField = 'gid'
    _data = None
    _featureLocks = None
    _errors = None

    def __init__(self, **kwargs):

        self.type = kwargs.get('type', self._type)
        self.pkField = kwargs.get('pkField', self._pkField)
        self.data = kwargs.get('data', self._data)
        self.featureLocks = kwargs.get('featureLocks', self._featureLocks)
        self.errors = kwargs.get('errors', self._errors)

    def setPkField(self, pkField):
        self._pkField = pkField

    def setData(self, data):
        self._data = data

    def setFeatureLocks(self, featuresLock):
        self.featureLocks = featuresLock

    def as_dict(self):

        return {
            'vector': {
                'type': self.type,
                'pk': self.pkField,
                'data': self.data
            },
            'featurelocks': self.featureLocks,
            'errors': self.errors
        }


