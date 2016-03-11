from django import template
from django.conf.urls.static import static

register = template.Library()


@register.inclusion_tag('core/tags/add_project.html')
def g3wadmin_add_project(app, group):
    return {'app': app, 'group': group}