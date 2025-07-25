
from django.conf import settings
from django import template
from django.apps import apps
from django.conf.urls.static import static
from core.signals import (
    load_project_widgets,
    load_layer_actions,
    load_project_layers_actions
)
from core.models import GroupProjectPanoramic
from core.utils.slugify import slugify as _slugify


register = template.Library()


@register.inclusion_tag('core/tags/add_project.html')
def g3wadmin_add_project(app, group):
    """
    Template tag to build add project button
    """

    oapp = apps.get_app_config(app)
    app_name = oapp.alias if hasattr(oapp, 'alias') else app
    app_icon = oapp.icon if hasattr(oapp, 'icon') else None

    return {'app': app, 'alias': app_name, 'icon': app_icon, 'group': group}


@register.inclusion_tag('core/tags/add_layer.html')
def g3wadmin_add_layer(app, group):
    """
    Template tag to add layer button
    """
    return {'app': app, 'group': group}


@register.inclusion_tag('core/include/form_buttons.html')
def g3wadmin_add_button_form(save=True, redo=True):
    """
    Template tag to add save and redo form buttons
    """
    return {'save': save, 'redo': redo}


@register.simple_tag()
def g3wadmin_progress_bar_values(current, min=0, max=100):
    """
    Template tag to calculate % value for a progress bar
    """
    return {
        'position': int(int(current)/(max-min)*100)
    }


@register.simple_tag()
def g3wadmin_project_widgets(project, app_name, user):
    """
    Template tag to get project specific widgets
    """
    widgets = load_project_widgets.send(user, project=project, app_name=app_name)

    template_widgets = []
    for widget in widgets:
        if widgets and widget[1]:
            template_widgets.append(widget[1])

    return template_widgets


@register.simple_tag()
def g3wadmin_layer_actions(layer, app_name, user):
    """
    Template tag to get project specific widgets
    """
    actions = load_layer_actions.send(user, layer=layer, app_name=app_name)

    order_actions = []

    if 'caching' in settings.INSTALLED_APPS:
        order_actions.append('caching_layer_action')

    if 'editing' in settings.INSTALLED_APPS:
        order_actions.append('editing_layer_actions')

    if 'qplottly' in settings.INSTALLED_APPS:
        order_actions.append('qplottly_layer_action')

    order_actions += [
        'filter_by_user_layer_action'
    ]

    no = {}
    no1 = []
    no2 = []
    for action in actions:
        fname = action[0].__name__
        no[fname] = action
        if fname not in order_actions:
            no2.append(action)
    for oaction in order_actions:
            no1.append(no[oaction])

    actions = no1 + no2

    template_actions = []
    for action in actions:
        if actions and action[1]:
            template_actions.append(action[1])

    return template_actions

@register.simple_tag()
def g3wadmin_project_layers_actions(project, app_name, user):
    """
    Template tag to get actions from load_project_layers_actions signal
    """
    actions = load_project_layers_actions.send(user, project=project, app_name=app_name)

    template_actions = []
    for action in actions:
        if actions and action[1]:
            template_actions.append(action[1])

    return template_actions

@register.filter
def lookup(d, key):
    """
    Template filter to get value from dict by key
    """
    return d[key]


@register.simple_tag()
def g3wadmin_get_projects_number(group, user, is_active=None):
    """
    Template tag to get projects(is_active=1) number for group by user
    """
    return group.getProjectsNumber(user, is_active)


@register.filter
def islist(o):
    """
    Template tag to check if is str
    """

    return isinstance(o, list)

@register.filter(is_safe=True)
def g3wadmin_slugify(content):
    """
    Slugify a given string. Complements the default Django slugify filter by allowing more complex slugify/transliteration behavior.
    """
    return _slugify(content)
