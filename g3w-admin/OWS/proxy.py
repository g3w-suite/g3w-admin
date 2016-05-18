from django.http import HttpResponse
from .auth import AuthForbiddenRequest


class Proxy(object):
    def __init__(self, authorizer_class = None, **kwargs):
        self.authorizer_class = authorizer_class

    def request(self,request, OWSRequestHandler, **kwargs):
        # authorizer = self.authorizer_class()
        #self.OWSRequestHandler = OWSRequestHandler(request, **kwargs)
        OWSrh = OWSRequestHandler(request, **kwargs)
        try:
            """
            First try to perfom request by OWS module handler
            """
            self.authorizer = OWSrh.authorizer
            self.authorizer.auth_request()
        except AuthForbiddenRequest:
            raise AuthForbiddenRequest()
        except:
            try:
                """
                Second try to perfom proxy authorizer base
                """
                self.authorizer = self.authorizer_class()
                self.authorizer.auth_request(request)
            except AuthForbiddenRequest:
                raise AuthForbiddenRequest
            except:
                return HttpResponse("The proxy service requires a URL-encoded URL as a parameter.",
                                status=400,
                                content_type="text/plain")
        else:
            _response = OWSrh.doRequest()
            return _response
