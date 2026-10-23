from django.conf import settings
from django.utils.decorators import wraps
from django.http.response import HttpResponseForbidden
from django.shortcuts import render
from django.template import RequestContext
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.apps import apps
from django.contrib.auth import REDIRECT_FIELD_NAME
from guardian.exceptions import GuardianError
from guardian.utils import get_40x_or_None, get_anonymous_user
from qdjango.utils.session import reset_filtertoken

import logging

logger = logging.getLogger('g3wadmin.debug')


def project_type_permission_required(perm, lookup_variables=None, **kwargs):
    """
    Decorator for views that checks whether a user has a particular permission
    enabled.

    Optionally, instances for which check should be made may be passed as an
    second argument or as a tuple parameters same as those passed to
    ``get_object_or_404`` but must be provided as pairs of strings. This way
    decorator can fetch i.e. ``User`` instance based on performed request and
    check permissions on it (without this, one would need to fetch user instance
    at view's logic and check permission inside a view).

    :param login_url: if denied, user would be redirected to location set by
      this parameter. Defaults to ``django.conf.settings.LOGIN_URL``.
    :param redirect_field_name: name of the parameter passed if redirected.
      Defaults to ``django.contrib.auth.REDIRECT_FIELD_NAME``.
    :param return_403: if set to ``True`` then instead of redirecting to the
      login page, response with status code 403 is returned (
      ``django.http.HttpResponseForbidden`` instance or rendered template -
      see :setting:`GUARDIAN_RENDER_403`). Defaults to ``False``.
    :param accept_global_perms: if set to ``True``, then *object level
      permission* would be required **only if user does NOT have global
      permission** for target *model*. If turned on, makes this decorator
      like an extension over standard
      ``django.contrib.admin.decorators.permission_required`` as it would
      check for global permissions first. Defaults to ``False``.

    Examples::
        @permission_required('qdjango.edit_notes', ('qdjango', '2'))
        def my_view(request, username):
            ...
    """
    login_url = kwargs.pop("login_url", settings.LOGIN_URL)
    redirect_field_name = kwargs.pop("redirect_field_name", REDIRECT_FIELD_NAME)
    return_403 = kwargs.pop("return_403", False)
    accept_global_perms = kwargs.pop("accept_global_perms", False)

    # Check if perm is given as string in order not to decorate
    # view function itself which makes debugging harder
    if not isinstance(perm, str):
        raise GuardianError(
            "First argument must be in format: "
            "'app_label.codename or a callable which return similar string'"
        )

    def decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            # if more than one parameter is passed to the decorator we try to
            # fetch object for which check would be made
            obj = None
            if lookup_variables:
                project_type, project_key = lookup_variables[0], lookup_variables[1]
                project_key_value = kwargs[project_key]
                project_type_value = kwargs[project_type]
                # Parse model
                if project_type_value in settings.G3WADMIN_PROJECT_APPS:
                    model = apps.get_model(project_type_value, "Project")
                else:
                    raise GuardianError(
                        "{} no in G3W_PROJECT_APPS: ".format(
                            project_type_value, settings.G3WADMIN_PROJECT_APPS
                        )
                    )

                if project_key_value.isdigit():
                    lookup_dict = {"pk": int(project_key_value)}
                else:
                    lookup_dict = {"slug": project_key_value}
                obj = get_object_or_404(model, **lookup_dict)

            # ad app to perm
            perms = [project_type_value + "." + perm]

            response = get_40x_or_None(
                request,
                perms=perms,
                obj=obj,
                login_url=login_url,
                redirect_field_name=redirect_field_name,
                return_403=return_403,
                accept_global_perms=accept_global_perms,
            )
            if response:
                return response
            return view_func(request, *args, **kwargs)

        return wraps(view_func)(_wrapped_view)

    return decorator


def is_active_required(lookup_variables=None, is_active=1):
    """
    Decorator for views that checks whether a model object is_active = 1.
    """

    def decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):

            model, lookups = lookup_variables[0], lookup_variables[1:]
            project_type, project_key = lookup_variables[0], lookup_variables[1]

            # Parse lookups
            if len(lookups) % 2 != 0:
                raise GuardianError(
                    "Lookup variables must be provided "
                    "as pairs of lookup_string and view_arg"
                )
            lookup_dict = {}
            for lookup, view_arg in zip(lookups[::2], lookups[1::2]):
                if view_arg not in kwargs:
                    raise GuardianError(
                        "Argument %s was not passed " "into view function" % view_arg
                    )
                lookup_dict[lookup] = kwargs[view_arg]
            obj = get_object_or_404(model, **lookup_dict)

            try:
                permanent_delete = request.POST['permanent_delete']
                if permanent_delete == '0':
                    permanent_delete = False
                else:   
                    permanent_delete = True
            except:
                permanent_delete = False

            if not permanent_delete and not obj.is_active == is_active:
                return HttpResponseForbidden()

            return view_func(request, *args, **kwargs)

        return wraps(view_func)(_wrapped_view)

    return decorator


def cache_page(timeout, key_args, key_prefix="", cache_alias=None):
    """
    Custom caching page decorator for g3w-suite pages.

    :param timeout: Time to take the cache, None is infinite
    :type timeout: int
    :param key_args: A list of django urls parameters to use to make the cache key
    :type key_args: list
    :param key_prefix: A string to use for cache key prefix, default is empty string
    :type key_prefix: str
    :returns: Wrapped view method
    """

    def _decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):

            # Check if caching is active
            if not settings.QDJANGO_PRJ_CACHE or request.session.get('permalink_code') != None:
                return view_func(request, *args, **kwargs)

            if request.user.is_anonymous:
                user_pk =  get_anonymous_user().pk
            else:
                user_pk = request.user.pk

            # Reset sessiontokenfilter
            reset_filtertoken(request)

            key = f"{key_prefix}{'_'.join([str(kwargs[k]) for k in key_args]  + [str(user_pk)])}"
            logger.debug(f"[CACHING /api/config]: Key {key}")
            response = cache.get(key)
            if not response:
                response = view_func(request, *args, **kwargs)
                if hasattr(response, "render") and callable(response.render):

                    def post_render(r):
                        cache.set(key, r, timeout)
                        return None

                    response.add_post_render_callback(post_render)
                else:
                    cache.set(key, response, timeout)
            return response

        return _wrapped_view

    return _decorator
