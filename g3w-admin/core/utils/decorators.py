from django.utils.decorators import wraps
from django.core.signing import Signer
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.conf import settings
from .projects import countAllProjects

globalSigner = Signer()


def check_madd(var, model, **kwargs):
    var = globalSigner.unsign(var)
    var_value = getattr(settings, var)
    if not var_value:
        raise Exception('MGC or MPC is not set!')

    def decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):

            if var_value == '-99:dodfEz3K2rziGayGnw_FyOuWdCM':
                return view_func(request, *args, **kwargs)

            if var == 'MPC:XYamtBJA_JgFGmFvEa9x193rnLg':
                objects = countAllProjects()
            else:
                objects = model.objects.count()

            if objects >= int(globalSigner.unsign(var_value)):
                template_name = 'core/403_{}.html'.format(var)
                response = render_to_response(template_name, {}, RequestContext(request))
                response.status_code = 403
                return response
            return view_func(request, *args, **kwargs)
        return wraps(view_func)(_wrapped_view)
    return decorator

