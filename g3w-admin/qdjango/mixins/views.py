
class QdjangoProjectViewMixin(object):
    '''
    Mixins for Class View for get group slug and r object for get
    '''

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.project_slug = kwargs.get('project_slug')
        return super(QdjangoProjectViewMixin, self).dispatch(request, *args, **kwargs)

