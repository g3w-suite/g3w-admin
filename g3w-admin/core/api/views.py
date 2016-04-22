from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.utils import six
from rest_framework.views import APIView
from rest_framework import exceptions, status
from rest_framework.compat import set_rollback
from rest_framework.response import Response
from copy import copy

class G3WAPIResults(object):
    """
    Class to manage results response G3W API
    """
    _results = {
        'result': True
    }

    def __init__(self, **kwargs):
        self.results = copy(self._results)
        self.results.update(kwargs)

    @property
    def result(self):
        return self.results['result']

    @result.setter
    def result(self, status):
        self.results.update({
            'result': bool(status)
        })

    @property
    def errors(self):
        return self.results['errors']

    @errors.setter
    def errors(self, errorsData):
        self.results.update({
            'errors': errorsData
        })

    def update(self, kwargs):
        self.results.update(kwargs)
        return self



def G3WExceptionHandler(exc, context):
    """
    Returns the response that should be used for any given exception.

    By default we handle the REST framework `APIException`, and also
    Django's built-in `Http404` and `PermissionDenied` exceptions.

    Any unhandled exceptions may return `None`, which will cause a 500 error
    to be raised.
    """

    data = G3WAPIResults()
    data.result = False

    if isinstance(exc, exceptions.APIException):
        headers = {}
        if getattr(exc, 'auth_header', None):
            headers['WWW-Authenticate'] = exc.auth_header
        if getattr(exc, 'wait', None):
            headers['Retry-After'] = '%d' % exc.wait

        data.errors = exc.detail

        set_rollback()
        return Response(data.results, status=exc.status_code, headers=headers)

    elif isinstance(exc, Http404):
        msg = _('Not found.')
        data.errros = six.text_type(msg)

        set_rollback()
        return Response(data.results, status=status.HTTP_404_NOT_FOUND)

    elif isinstance(exc, PermissionDenied):
        msg = _('Permission denied.')
        data. errors = six.text_type(msg)

        set_rollback()
        return Response(data.results, status=status.HTTP_403_FORBIDDEN)

    # Note: Unhandled exceptions will raise a 500 error.
    return None


class G3WAPIView(APIView):
    """
    Overload of rest framework APIView fro G3W-admin framework
    """

    def dispatch(self, request, *args, **kwargs):

        # instance G3WApiResults
        self.results = G3WAPIResults()
        return super(G3WAPIView, self).dispatch(request, *args, **kwargs)