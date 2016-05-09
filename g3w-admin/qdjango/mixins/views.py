
class QdjangoProjectViewMixin(object):
    '''
    Mixins for Class View for get group slug and r object for get
    '''

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.project_slug = kwargs.get('project_slug')
        return super(QdjangoProjectViewMixin, self).dispatch(request, *args, **kwargs)


class QdjangoLayertViewMixin(object):
    '''
    Mixins for Class View for get layer slug
    '''

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.layer_slug = kwargs.get('slug')
        return super(QdjangoLayertViewMixin, self).dispatch(request, *args, **kwargs)