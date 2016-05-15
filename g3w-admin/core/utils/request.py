from httplib import HTTPConnection
from urlparse import urlsplit
from django.http.request import QueryDict


def makeRequest(url, body='', q=None, method='GET', port=80, headers=None):

    if not headers:
        headers = {}
    urlData = urlsplit(url)

    conn = HTTPConnection(urlData.netloc)

    queryUrl = urlData.query + q.urlencode() if isinstance(q, QueryDict) else urlData.query
    urlReduild = u'{}://{}{}?{}'.format(urlData.scheme, urlData.netloc, urlData.path, queryUrl)
    conn.request(method, urlReduild, body, headers)

    return conn.getresponse()