
from urllib import quote

from django.conf import settings

def add_spid_redirect_link(request):

    return_address = quote(request.get_raw_uri())

    return {
        'spid_enabled': settings.SPID_ENABLED,
        'spid_redirect_url': settings.SPID_REDIRECT_BASE_URL + return_address,
    }