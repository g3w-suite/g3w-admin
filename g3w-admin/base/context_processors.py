from django.conf import settings
from django.core.urlresolvers import resolve
from datetime import datetime
from usersmanage.configs import *

def global_settings(request):
    g3wadmin_context = {}
    g3wadmin_context['SETTINGS'] = settings

    # add group base
    g3wadmin_context['G3W_EDITOR1'] = G3W_EDITOR1
    g3wadmin_context['G3W_EDITOR2'] = G3W_EDITOR2
    g3wadmin_context['G3W_VIEWER1'] = G3W_VIEWER1
    g3wadmin_context['G3W_VIEWER2'] = G3W_VIEWER2

    groupsUser = request.user.groups.values_list('name', flat=True)
    if request.user.is_superuser and request.user.is_staff:
        g3wadmin_context['adminlte_skin'] = 'skin-yellow'
    elif request.user.is_superuser:
        g3wadmin_context['adminlte_skin'] = 'skin-red'
    elif G3W_EDITOR1 in groupsUser or G3W_EDITOR2 in groupsUser:
        g3wadmin_context['adminlte_skin'] = 'skin-purple'
    elif G3W_VIEWER1 in groupsUser or G3W_VIEWER2 in groupsUser:
        g3wadmin_context['adminlte_skin'] = 'skin-green'
    else:
        g3wadmin_context['adminlte_skin'] = settings.ADMINLTE_SKIN_DEFAULT

    g3wadmin_context['adminlte_layout_option'] = settings.ADMINLTE_LAYOUT_OPTION

    # add date current time
    g3wadmin_context['today'] = datetime.today()


    return g3wadmin_context
