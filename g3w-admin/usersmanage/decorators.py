from django.utils.decorators import wraps
from django.shortcuts import render
from django.template import RequestContext
from django.shortcuts import get_object_or_404
from guardian.conf import settings as guardian_settings
from guardian.exceptions import GuardianError
from guardian.utils import get_anonymous_user
from guardian.shortcuts import get_perms
from .utils import get_perms_by_user_backend


def permission_required_by_user_backend(user, perm, user_tuple, **kwargs):
    """
    Check if perm to check is in user perms fo ouser
    """
    model, lookups = user_tuple[0], user_tuple[1:]
    lookup_dict = {}
    for lookup, view_arg in zip(lookups[::2], lookups[1::2]):
        if view_arg not in kwargs:
            raise GuardianError("Argument %s was not passed "
                                "into view function" % view_arg)
        lookup_dict[lookup] = kwargs[view_arg]

    ouser = get_object_or_404(model, **lookup_dict)
    perms = get_perms_by_user_backend(user, ouser)
    return perm in perms


def permission_required_by_backend_or_403(perm, lookup_variables=None, **kwargs):

    def decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not permission_required_by_user_backend(request.user, perm, lookup_variables, **kwargs):
                template_name = guardian_settings.TEMPLATE_403
                response = render(request, template_name)
                response.status_code = 403
                return response
            return view_func(request, *args, **kwargs)
        return wraps(view_func)(_wrapped_view)
    return decorator

import types
def user_passes_test_or_403(test_func):
    """
    Decorator for views that checks that the user passes the given test,
    403 forbidden.
    """

    def decorator(view_func, **view_func_kwargs):
        def _wrapped_view(request, *args, **kwargs):
            nkwargs = view_func_kwargs if test_func.__name__ == '<lambda>' else kwargs
            if not test_func(request.user, **nkwargs):
                template_name = guardian_settings.TEMPLATE_403
                response = render(request, template_name)
                response.status_code = 403
                return response
            return view_func(request, *args, **kwargs)
        return wraps(view_func)(_wrapped_view)
    return decorator


def permission_required_for_anonymous_user(perm, user_tuple, **kwargs):
    """
    Check if anonymous user has perms on object
    """
    model, lookups = user_tuple[0], user_tuple[1:]
    lookup_dict = {}
    for lookup, view_arg in zip(lookups[::2], lookups[1::2]):
        if view_arg not in kwargs:
            raise GuardianError("Argument %s was not passed "
                                "into view function" % view_arg)
        lookup_dict[lookup] = kwargs[view_arg]

    perms = get_perms(get_anonymous_user(), get_object_or_404(model, **lookup_dict))
    return perm in perms


def permission_required_for_anonymous_user_or_403(perm, lookup_variables=None, **kwargs):

    def decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not permission_required_for_anonymous_user(perm, lookup_variables, **kwargs):
                template_name = guardian_settings.TEMPLATE_403
                response = render(request, template_name)
                response.status_code = 403
                return response
            return view_func(request, *args, **kwargs)
        return wraps(view_func)(_wrapped_view)
    return decorator
