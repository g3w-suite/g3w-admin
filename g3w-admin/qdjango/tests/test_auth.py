from unittest.mock import Mock, patch

from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed

from OWS.auth import AuthForbiddenRequest, UnauthorizedRequest
from OWS.proxy import Proxy
from qdjango.auth import QdjangoProjectAuthorizer


@override_settings(G3WADMIN_LOCAL_MORE_APPS=[])
class QdjangoProjectAuthorizerTest(SimpleTestCase):
    def test_basic_authentication_attempts(self):
        for header, public, expected in (
            ('', False, UnauthorizedRequest),
            ('Bearer token', False, UnauthorizedRequest),
            ('Basic', False, UnauthorizedRequest),
            ('bAsIc invalid', False, UnauthorizedRequest),
            ('Basic dXNlcjpwYXNz', False, UnauthorizedRequest),
            ('', True, True),
            ('Bearer token', True, True),
            ('Basic', True, True),
            ('Basic dXNlcjpwYXNz', True, True),
        ):
            with self.subTest(header=header, public=public):
                anonymous = Mock()
                anonymous.has_perm.return_value = public
                request = RequestFactory().get('/', HTTP_AUTHORIZATION=header)
                request.user = anonymous
                authorizer = QdjangoProjectAuthorizer(request=request, project=object())
                with patch('qdjango.auth.get_anonymous_user', return_value=anonymous), \
                        patch('qdjango.auth.BasicAuthentication.authenticate_credentials',
                              side_effect=AuthenticationFailed('Invalid credentials')):
                    if expected is True:
                        self.assertTrue(authorizer.auth_request())
                    else:
                        with self.assertRaises(expected):
                            authorizer.auth_request()

    def test_valid_basic_credentials(self):
        for permitted in (False, True):
            with self.subTest(permitted=permitted):
                anonymous = Mock()
                anonymous.has_perm.return_value = False
                user = Mock()
                user.has_perm.return_value = permitted
                request = RequestFactory().get('/', HTTP_AUTHORIZATION='Basic dXNlcjpwYXNz')
                request.user = anonymous
                project = object()
                authorizer = QdjangoProjectAuthorizer(request=request, project=project)
                with patch('qdjango.auth.get_anonymous_user', return_value=anonymous), \
                        patch('qdjango.auth.BasicAuthentication.authenticate_credentials',
                              return_value=(user, None)):
                    if permitted:
                        self.assertTrue(authorizer.auth_request())
                    else:
                        with self.assertRaises(AuthForbiddenRequest):
                            authorizer.auth_request()
                    self.assertIs(request.user, user)
                    user.has_perm.assert_called_once_with('qdjango.view_project', project)

    def test_proxy_authentication_responses(self):
        for identity, permitted, status in (
            ('anonymous', False, 401),
            ('guardian', False, 401),
            ('session', False, 403),
            ('session', True, 200),
            ('anonymous', True, 200),
        ):
            with self.subTest(identity=identity, permitted=permitted):
                anonymous = Mock()
                anonymous.has_perm.return_value = permitted
                request = RequestFactory().get('/')
                if identity == 'anonymous':
                    request.user = AnonymousUser()
                elif identity == 'guardian':
                    request.user = anonymous
                else:
                    request.user = Mock(is_authenticated=True)
                    request.user.has_perm.return_value = permitted
                authorizer = QdjangoProjectAuthorizer(request=request, project=object())
                handler = Mock(authorizer=authorizer)
                handler.doRequest.return_value = HttpResponse('<xml/>', content_type='text/xml')
                with patch('qdjango.auth.get_anonymous_user', return_value=anonymous):
                    response = Proxy().request(request, Mock(return_value=handler))
                self.assertEqual(response.status_code, status)
                if status == 401:
                    self.assertEqual(response['WWW-Authenticate'], 'Basic realm="api"')
                else:
                    self.assertNotIn('WWW-Authenticate', response)
                if status != 200:
                    handler.doRequest.assert_not_called()

    def test_proxy_basic_authentication_responses(self):
        for credentials, permitted, status in (
            (None, False, 401),
            (Mock(), False, 403),
            (Mock(), True, 200),
        ):
            with self.subTest(permitted=permitted, status=status):
                anonymous = Mock()
                anonymous.has_perm.return_value = False
                request = RequestFactory().get('/', HTTP_AUTHORIZATION='Basic dXNlcjpwYXNz')
                request.user = anonymous
                if credentials is not None:
                    credentials.has_perm.return_value = permitted
                authorizer = QdjangoProjectAuthorizer(request=request, project=object())
                handler = Mock(authorizer=authorizer)
                handler.doRequest.return_value = HttpResponse('<xml/>', content_type='text/xml')
                with patch('qdjango.auth.get_anonymous_user', return_value=anonymous), \
                        patch('qdjango.auth.BasicAuthentication.authenticate_credentials',
                              return_value=(credentials, None),
                              side_effect=AuthenticationFailed('Invalid credentials')
                              if credentials is None else None):
                    response = Proxy().request(request, Mock(return_value=handler))
                self.assertEqual(response.status_code, status)
                if status == 401:
                    self.assertEqual(response['WWW-Authenticate'], 'Basic realm="api"')
                if status != 200:
                    handler.doRequest.assert_not_called()
