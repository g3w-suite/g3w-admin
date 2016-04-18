



class APIVectorLayerStructure(object):

    _format = 'GeoJSON'
    _pkField = 'gid'
    _data = None
    _featureLocks = None
    _errors = None
    _geomentryType = None
    _fields = None
    _relations = None
    _relationsdata = None

    def __init__(self, **kwargs):

        self.format = kwargs.get('type', self._format)
        self.pkField = kwargs.get('pkField', self._pkField)
        self.data = kwargs.get('data', self._data)
        self.featureLocks = kwargs.get('featureLocks', self._featureLocks)
        self.errors = kwargs.get('errors', self._errors)
        self.geometryType = kwargs.get('geomentryType', self._geomentryType)
        self.fields = kwargs.get('fields', self._fields)
        self.relations = kwargs.get('relations', self._relations)
        self.relationsdata = kwargs.get('relationsdata', self._relationsdata)

    def setPkField(self, pkField):
        self._pkField = pkField

    def setData(self, data):
        self._data = data

    def setFeatureLocks(self, featuresLock):
        self.featureLocks = featuresLock

    def setFields(self, fields):
        self.fields = fields

    def setRealations(self, relations):
        self.relations = relations

    def setRealationsData(self, relationsdata):
        self.relationsdata = relationsdata

    def as_dict(self):

        res = {
            'vector': {
                'format': self.format,
                'pk': self.pkField,
                'data': self.data,
                'geometrytype': self.geometryType,
                'fields': self.fields,
                'relations': self.relations,
                'relationsdata': self.relationsdata
            },
            'featurelocks': self.featureLocks,
            'errors': self.errors
        }

        return res



