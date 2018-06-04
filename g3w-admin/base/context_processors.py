from django.conf import settings
from datetime import datetime
from usersmanage.configs import *
from core.signals import load_css_modules, load_js_modules, load_navbar_items
from base.version import get_version


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

    # add cookies:
    g3wadmin_context['sidebar_status'] = 'sidebar-open'
    if 'g3wadmin_sidebar_status' in request.COOKIES:
        if request.COOKIES['g3wadmin_sidebar_status'] == 'collapsed':
            g3wadmin_context['sidebar_status'] = 'sidebar-collapse'

    # add specific css modules and submodules
    css_modules = load_css_modules.send(request)
    g3wadmin_context['css_modules'] = [css[1] for css in css_modules]
    js_modules = load_js_modules.send(request)
    g3wadmin_context['js_modules'] = [js[1] for js in js_modules]

    # add specific items to main navbar
    navbar_items = load_navbar_items.send(request)
    g3wadmin_context['navbar_items'] = list()
    for item in navbar_items:
        if isinstance(item[1], list):
            g3wadmin_context['navbar_items'] += item[1]
        else:
            g3wadmin_context['navbar_items'].append(item[1])

    g3wadmin_context['VERSION'] = get_version()

    return g3wadmin_context
