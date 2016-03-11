from django import template
from django.conf.urls.static import static

register = template.Library()

@register.inclusion_tag('core/tags/svg_icon.html')
def svg_icon(sprite,idIcon):

    return {'sprite': sprite,'idicon':idIcon, 'title':idIcon}
