from django.conf import settings
from django.core.urlresolvers import resolve

def global_settings(request):
    qdjango2_context = {}
    qdjango2_context['SETTINGS'] = settings

    #todo: select adminlte skin by user group

    qdjango2_context['adminlte_skin'] = settings.ADMINLTE_SKIN_DEFAULT
    qdjango2_context['adminlte_layout_option'] = settings.ADMINLTE_LAYOUT_OPTION

    #for login page remove skin a layout option
    if resolve(request.path_info).url_name == 'login':
        qdjango2_context['adminlte_skin'] = 'login-page'
        del(qdjango2_context['adminlte_layout_option'])

    return qdjango2_context
