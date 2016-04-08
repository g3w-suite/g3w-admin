from __future__ import division
from django import template
from django.conf.urls.static import static


register = template.Library()


@register.inclusion_tag('core/tags/add_project.html')
def g3wadmin_add_project(app, group):
    return {'app': app, 'group': group}


@register.inclusion_tag('core/include/form_buttons.html')
def g3wadmin_add_button_form(save=True, redo=True):
    return {'save': save, 'redo': redo}

@register.simple_tag()
def g3wadmin_progress_bar_values(current, min=0, max=100):
    return {
        'position': int(int(current)/(max-min)*100)
    }