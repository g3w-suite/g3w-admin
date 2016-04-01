from django.conf import settings
from django.core.urlresolvers import resolve

def global_settings(request):
    g3wadmin_context = {}
    g3wadmin_context['SETTINGS'] = settings

    groupsUser = request.user.groups.values_list('name', flat=True)
    if request.user.is_superuser and request.user.is_staff:
        g3wadmin_context['adminlte_skin'] = 'skin-yellow'
    elif request.user.is_superuser:
        g3wadmin_context['adminlte_skin'] = 'skin-red'
    elif 'Editor Maps Groups' in groupsUser:
        g3wadmin_context['adminlte_skin'] = 'skin-purple'
    elif 'Viewer Maps Groups' in groupsUser:
        g3wadmin_context['adminlte_skin'] = 'skin-green'
    else:
        g3wadmin_context['adminlte_skin'] = settings.ADMINLTE_SKIN_DEFAULT

    g3wadmin_context['adminlte_layout_option'] = settings.ADMINLTE_LAYOUT_OPTION

    #for login page remove skin a layout option
    if resolve(request.path_info).url_name == 'login':
        g3wadmin_context['adminlte_skin'] = 'login-page'
        del(g3wadmin_context['adminlte_layout_option'])


    return g3wadmin_context
