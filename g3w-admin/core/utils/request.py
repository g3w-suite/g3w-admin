from __future__ import unicode_literals
try:
    from urlparse import urlsplit
    from httplib import HTTPConnection
except:
    from http.client import HTTPConnection
    from urllib.parse import urlsplit
from django.http.request import QueryDict


def makeRequest(url, body='', q=None, method='GET', port=80, headers=None, **kwargs):

    if not headers:
        headers = {}
    urlData = urlsplit(url)

    conn = HTTPConnection(urlData.netloc)

    queryUrl = urlData.query + q.urlencode() if isinstance(q, QueryDict) else urlData.query
    urlReduild = '{}://{}{}?{}'.format(urlData.scheme, urlData.netloc, urlData.path, queryUrl)
    conn.request(method, urlReduild, body, headers)

    return conn.getresponse()