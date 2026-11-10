
class AuthForbiddenRequest(Exception):
    pass


class UnauthorizedRequest(Exception):
    """ Raised when a request is unauthorized. """
    pass

class NullAuthorizer(object):
    def auth_request(self, request):
        return True

    def filter_request(self, request):
        return request

    def filter_response(self, response):
        return response


class BlockAllAuthorizer(NullAuthorizer):
    def auth_request(self, request):
        raise AuthForbiddenRequest

