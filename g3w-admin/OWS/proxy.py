from django.http import HttpResponse
from .auth import AuthForbiddenRequest

import logging

logger = logging.getLogger('g3wadmin.debug')

from subprocess import check_output
ips = check_output(['hostname', '--all-ip-addresses'])


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
            #try to che caller
            logger.debug(request.META['REMOTE_ADDR'])
            logger.debug(request.META['HTTP_USER_AGENT'])
            logger.debug(request.META)
            if request.META['REMOTE_ADDR'] in ips and 'Python' in request.META['HTTP_USER_AGENT']:
                pass
            else:
                authorizer = OWSrh.authorizer
                authorizer.auth_request()
        except AuthForbiddenRequest:
            raise AuthForbiddenRequest()
        except Exception as e:
            try:
                """
                Second try to perfom proxy authorizer base
                """
                authorizer = self.authorizer_class()
                authorizer.auth_request(request)
            except AuthForbiddenRequest:
                raise AuthForbiddenRequest
            except:
                return HttpResponse("The proxy service requires a URL-encoded URL as a parameter.",
                                status=400,
                                content_type="text/plain")
        else:
            _response = OWSrh.doRequest()
            return _response
