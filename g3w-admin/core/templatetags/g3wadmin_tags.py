
from django import template
from django.apps import apps
from django.conf.urls.static import static
from core.signals import load_project_widgets, load_layer_actions
from core.models import GroupProjectPanoramic


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
def g3wadmin_get_projects_number(group, user):
    """
    Template tag to get projets number for group by user
    """
    return group.getProjectsNumber(user)
