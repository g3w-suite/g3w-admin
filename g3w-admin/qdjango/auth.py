from django.conf import settings
from guardian.shortcuts import get_anonymous_user
from rest_framework.authentication import BasicAuthentication
from OWS.auth import AuthForbiddenRequest


class QdjangoProjectAuthorizer(object):

    def __init__(self, **kwargs):
        for k, v in list(kwargs.items()):
            setattr(self, k, v)

    def auth_request(self, **kwargs):

        anonymous_user = get_anonymous_user()

        # Check for caching token
        # -----------------------
        if (len(set(settings.G3WADMIN_LOCAL_MORE_APPS).intersection(set(['caching', 'qmapproxy']))) > 0
                and 'g3wsuite_caching_token' in self.request.GET and \
                (settings.TILESTACHE_CACHE_TOKEN == self.request.GET['g3wsuite_caching_token'] or \
                        getattr(settings, 'MAPPROXY_URL_TOKEN') == self.request.GET['g3wsuite_caching_token'])):
                    return True

        # Check for user != Anonymous user
        # User already authenticated (session, middleware, etc.)
        if self.request.user != anonymous_user and self.request.user.has_perm('qdjango.view_project', self.project):
            return True
        else:

            # Try to authenticate by HTTP Basic Authentication
            # ------------------------------------------------
            try:
                ba = BasicAuthentication()
                user, other = ba.authenticate(self.request)
                self.request.user = user
                return user.has_perm('qdjango.view_project', self.project)
            except Exception as e:

                # Check for Anonymous user
                # -------------------------
                if anonymous_user.has_perm('qdjango.view_project', self.project):
                    return True

                pass

            raise AuthForbiddenRequest()

    def filter_request(self, request):
        return request

    def filter_response(self, response):
        return response