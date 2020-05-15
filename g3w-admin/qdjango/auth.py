from django.conf import settings
from guardian.shortcuts import get_anonymous_user
from OWS.auth import AuthForbiddenRequest


class QdjangoProjectAuthorizer(object):

    def __init__(self, **kwargs):
        for k, v in list(kwargs.items()):
            setattr(self, k, v)

    def auth_request(self, **kwargs):

        # check for caching token
        if 'caching' in settings.G3WADMIN_LOCAL_MORE_APPS and 'g3wsuite_caching_token' in self.request.GET and \
                settings.TILESTACHE_CACHE_TOKEN == self.request.GET['g3wsuite_caching_token']:
                    return True

        if self.request.user.has_perm('qdjango.view_project', self.project) or\
                get_anonymous_user().has_perm('qdjango.view_project', self.project):
            return True
        else:
            raise AuthForbiddenRequest()

    def filter_request(self, request):
        return request

    def filter_response(self, response):
        return response