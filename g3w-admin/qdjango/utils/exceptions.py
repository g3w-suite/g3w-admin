from django.utils.translation import gettext_lazy as _


class QgisException(Exception):
    pre_error_msg = _('Qgis Exceptions errors')


class QgisProjectException(QgisException):

    pre_error_msg = _('Project error')

    def __str__(self):
        return "[{}]-- {}".format(self.pre_error_msg, self.args[0])


class QgisProjectLayerException(QgisProjectException):

    pre_error_msg = _('Layer error')



