from django.utils.translation import gettext_lazy as _
from .general import ucfirst
import re


class XmlData(object):

    _dataToSet = []

    _exceptionclass = Exception

    _pre_exception_message = ''

    _defaultValidators = []

    def setData(self):
        """
        Set data to self object
        """
        for data in self._dataToSet:
            try:
                setattr(self, data, getattr(self, '_getData{}'.format(ucfirst(data)))())
            except Exception as e:
                raise self._exceptionclass(_('[{} error on {}({})]-- {}')
                                           .format(self._pre_exception_message, data, self, e))

    def registerValidator(self, validator):
        """
        Register a Validator object
        :param validator: Validator
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

    def __str__(self):
        """
        StrId Object for error
        """
        return ''


def isXML(string):
    """
    Check is string is a XML
    Derived from https://codereview.stackexchange.com/a/137948
    """

    # Remove tabs, spaces, and new lines when reading
    data = re.sub(r'\s+', '', string)
    if re.match(r'^<.+>$', data):
        return True
    else:
        return False
