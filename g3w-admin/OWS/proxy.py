from django.http import HttpResponse
from django.http.response import HttpResponseForbidden
from .auth import AuthForbiddenRequest, UnauthorizedRequest

import logging

logger = logging.getLogger('g3wadmin.debug')


class Proxy(object):
    def __init__(self, authorizer_class = None, **kwargs):
        self.authorizer_class = authorizer_class

    def request(self, request, OWSRequestHandler, **kwargs):
        # authorizer = self.authorizer_class()
        OWSrh = OWSRequestHandler(request, **kwargs)
        try:
            """
            First try to perfom request by OWS module handler
            """
            authorizer = OWSrh.authorizer
            authorizer.auth_request()
        except UnauthorizedRequest:
            return HttpResponse(status=401, headers={'WWW-Authenticate': 'Basic realm="api"'})
        except AuthForbiddenRequest:
            return HttpResponseForbidden()
        except Exception as e:
            try:
                """
                Second try to perfom proxy authorizer base
                """
                authorizer = self.authorizer_class()
                authorizer.auth_request(request)
            except UnauthorizedRequest:
                return HttpResponse(status=401, headers={'WWW-Authenticate': 'Basic realm="api"'})
            except AuthForbiddenRequest:
                return HttpResponseForbidden()
            except:
                return HttpResponse("The proxy service requires a URL-encoded URL as a parameter.",
                                status=400,
                                content_type="text/plain")
        else:
            _response = OWSrh.doRequest()
            return _response
