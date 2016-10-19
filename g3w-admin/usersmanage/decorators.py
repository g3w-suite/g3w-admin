from django.utils.decorators import wraps
from django.shortcuts import render_to_response
from django.template import RequestContext


def user_passes_test_or_403(test_func):
    """
        Decorator for views that checks that the user passes the given test,
        403 forbidden.
        """

    def decorator(view_func, **view_func_kwargs):
        def _wrapped_view(request, *args, **kwargs):
            if not test_func(request.user, **view_func_kwargs):
                template_name = '403.html'
                response = render_to_response(template_name, {}, RequestContext(request))
                response.status_code = 403
                return response
            return view_func(request, *args, **kwargs)
        return wraps(view_func)(_wrapped_view)
    return decorator