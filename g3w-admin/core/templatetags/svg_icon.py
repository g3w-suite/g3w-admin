from django import template
from django.conf.urls.static import static

register = template.Library()

@register.inclusion_tag('core/tags/svg_icon.html')
def svg_icon(sprite, idIcon, **kwargs):

    context_data = {'sprite': sprite, 'idicon': idIcon, 'title': idIcon}
    context_data.update(kwargs)
    return context_data
