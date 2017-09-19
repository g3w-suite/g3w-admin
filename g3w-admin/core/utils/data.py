from django.utils.translation import ugettext, ugettext_lazy as _
from .general import ucfirst
import re


class XmlDataException(Exception):

    def __init__(self, *args, **kwargs):
        self.pre_message = kwargs['pre_message'] if 'pre_message' in kwargs else None
        super(XmlDataException, self).__init__(*args, **kwargs)

    def __unicode__(self):
        return u'{}: {}'.format(self.pre_message, self.message)


class XmlData(object):

    _dataToSet = []

    _exceptionclass = XmlDataException

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
                raise self._exceptionclass(e.message,
                                           _('[Loading {} error] (Data: {})').format(self._pre_exception_message, data))

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


def isXML(string):
    """
    Check is string si a XML
    Derived from https://codereview.stackexchange.com/a/137948
    """

    # Remove tabs, spaces, and new lines when reading
    data = re.sub(r'\s+', '', string)
    if re.match(r'^<.+>$', data):
        return True
    else:
        return False
