from django.utils.translation import ugettext, ugettext_lazy as _


class QgisException(Exception):
    pre_error_msg = _('Qgis Exceptions errors')


class QgisProjectException(QgisException):

    pre_error_msg = _('Project error')

    def __init__(self, *args, **kwargs): # real signature unknown
        super(QgisException, self).__init__(*args, **kwargs)
        self.project = kwargs['project'] if 'project' in kwargs else None
        self.layer = kwargs['layer'] if 'layer' in kwargs else None

    def __unicode__(self):
        return u"[{}]-- {}".format(self.pre_error_msg, self.message)


class QgisProjectLayerException(QgisProjectException):

    pre_error_msg = _('Layer error')

    def __unicode__(self):
        return u"[{}]({})-- {}".format(self.pre_error_msg,
                                       getattr(self, 'name', self.layer.layerId),
                                       self.message)



