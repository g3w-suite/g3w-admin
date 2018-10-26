from django.conf import settings
from datetime import datetime
from guardian.utils import get_anonymous_user
from usersmanage.configs import *
from core.signals import load_css_modules, load_js_modules, load_navbar_items
from core.utils.general import get_adminlte_skin_by_user
from base.version import get_version


def global_settings(request):
    g3wadmin_context = {}
    g3wadmin_context['SETTINGS'] = settings

    # add group base
    g3wadmin_context['G3W_EDITOR1'] = G3W_EDITOR1
    g3wadmin_context['G3W_EDITOR2'] = G3W_EDITOR2
    g3wadmin_context['G3W_VIEWER1'] = G3W_VIEWER1
    g3wadmin_context['G3W_VIEWER2'] = G3W_VIEWER2

    # add anonymous user istance
    g3wadmin_context['anonymous_user'] = get_anonymous_user()

    skin = get_adminlte_skin_by_user(request.user)
    g3wadmin_context['adminlte_skin'] = 'skin-{}'.format(skin if skin else settings.ADMINLTE_SKIN_DEFAULT)

    g3wadmin_context['adminlte_layout_option'] = settings.ADMINLTE_LAYOUT_OPTION

    g3wadmin_context['powerd_by'] = settings.G3WSUITE_POWERD_BY

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

    g3wadmin_context['admin_page_title'] = getattr(settings, 'G3WSUITE_CUSTOM_TITLE', settings.SITE_TITLE)

    return g3wadmin_context
