from __future__ import division
from django import template
from django.conf.urls.static import static
from core.signals import load_project_widgets


register = template.Library()


@register.inclusion_tag('core/tags/add_project.html')
def g3wadmin_add_project(app, group):
    """
    Template tag to build add project button
    """
    return {'app': app, 'group': group}


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
def g3wadmin_project_widgets(project, app_name):
    """
    Template tag to get project specific widgets
    """
    widgets = load_project_widgets.send(None, project=project, app_name=app_name)

    return [widget[1] for widget in widgets]


@register.filter
def lookup(d, key):
    """
    Template filter to get value from dict by key
    """
    return d[key]