

class G3WRequestFormMixin(object):

    def __init__(self, *args, **kwargs):

        #get request object from kwargs
        if 'request' in kwargs:
            self.request = kwargs['request']
            del(kwargs['request'])
        super(G3WRequestFormMixin, self).__init__(*args, **kwargs)