from django import template
from django.conf.urls.static import static

register = template.Library()


@register.inclusion_tag('core/tags/add_project.html')
def g3wadmin_add_project(app, group):
    return {'app': app, 'group': group}


@register.inclusion_tag('core/include/form_buttons.html')
def g3wadmin_add_button_form(save=True, redo=True):
    return {'save': save, 'redo': redo}