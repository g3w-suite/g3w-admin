from __future__ import division
from django import template

register = template.Library()

@register.filter
def widget_linked_layer(widget, layer):
    return widget.layers.filter(pk=layer.id).exists()