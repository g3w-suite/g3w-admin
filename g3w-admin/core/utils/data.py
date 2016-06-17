from django.utils.translation import ugettext, ugettext_lazy as _
from .general import ucfirst


class XmlData(object):

    _dataToSet = []

    _introMessageException = ''

    _defaultValidators = []

    def setData(self):
        """
        Set data to self object
        """
        for data in self._dataToSet:
            try:
                setattr(self,data,getattr(self,'_getData{}'.format(ucfirst(data)))())
            except Exception as e:
                raise Exception(_('{} "{}" {}:'.format(self._introMessageException,data,e.message)))

    def registerValidator(self, validator):
        """
        Register a QgisProjectValidator object
        :param validator: QgisProjectValidator
        :return: None
        """
        self.validators.append(validator(self))

    def asXML(self):
        """
        Return data to xml format
        """
        pass

    def asJSON(self):
        """
        Return data to json format
        """
        pass