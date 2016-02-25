

class G3WRequestViewMixin(object):
    '''
    Mixins for Class FormView for get request object for get
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WRequestViewMixin,self).get_form_kwargs()

        #get request object from view
        kwargs['request'] = self.request
        return kwargs