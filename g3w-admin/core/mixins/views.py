from django.http import JsonResponse

class G3WRequestViewMixin(object):
    '''
    Mixins for Class FormView for get request object for get
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WRequestViewMixin,self).get_form_kwargs()

        #get request object from view
        kwargs['request'] = self.request
        return kwargs


class G3WAjaxDeleteViewMixin(object):
    '''
    Mixin for FormClass view for to delete object by ajax call
    '''

    def post(self,request, *args, **kwargs):
        self.object = self.get_object()

        # delete object
        self.object.delete();

        return JsonResponse({'status':'ok','message':'Object deleted!'})