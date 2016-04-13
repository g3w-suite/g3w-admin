from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    http://stackoverflow.com/a/30875830/566663
    """
    def enforce_csrf(self, request):
        return  # To not perform the csrf check previously happening