from django.utils.translation import gettext_lazy as _


class QgisException(Exception):
    pre_error_msg = _('Qgis Exceptions errors')

    def __init__(self, message, errors=None):
        super().__init__(message)
        # flat list of individual error messages this exception aggregates
        self.errors = errors if errors is not None else [message]


class QgisProjectException(QgisException):

    pre_error_msg = _('Project error')

    def __str__(self):
        return "[{}]-- {}".format(self.pre_error_msg, self.args[0])


class QgisProjectLayerException(QgisProjectException):

    pre_error_msg = _('Layer error')



