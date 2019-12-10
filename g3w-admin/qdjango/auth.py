from guardian.shortcuts import get_anonymous_user
from OWS.auth import AuthForbiddenRequest


class QdjangoProjectAuthorizer(object):

    def __init__(self, **kwargs):
        for k, v in list(kwargs.items()):
            setattr(self, k, v)

    def auth_request(self, **kwargs):

        # todo: impleent acl property name
        if self.request.user.has_perm('qdjango.view_project', self.project) or\
                get_anonymous_user().has_perm('qdjango.view_project', self.project):
            return True
        else:
            raise AuthForbiddenRequest()

    def filter_request(self, request):
        return request

    def filter_response(self, response):
        return response