from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import (
    TokenAuthentication, 
    BasicAuthentication
)
from rest_framework_simplejwt.authentication import JWTAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    http://stackoverflow.com/a/30875830/566663
    """
    def enforce_csrf(self, request):
        return  # To not perform the csrf check previously happening
    
class AutenticationWith403Mixin(object):
    """
    Mixin to return 403 instead of 401 when the token is invalid.
    """
    def authenticate_header(self, request):
        return None

class TokenAuthentication403(AutenticationWith403Mixin, TokenAuthentication):
    """
    Custom token authentication that returns 403 instead of 401 when the token is invalid.
    """
    pass

class BasicAuthentication403(AutenticationWith403Mixin, BasicAuthentication):
    """
    Custom basic authentication that returns 403 instead of 401 when the token is invalid.
    """
    pass

class JWTAuthentication403(AutenticationWith403Mixin, JWTAuthentication):
    """
    Custom JWT authentication that returns 403 instead of 401 when the token is invalid.
    """
    pass