
class LegIternetModelMixin(object):

    def __unicode__(self):
        return u'({}) {}'.format(self.id, self.description)