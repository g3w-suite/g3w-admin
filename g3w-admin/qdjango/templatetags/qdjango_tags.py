from __future__ import division
from django import template
from qdjango.models import Layer

register = template.Library()

@register.filter
def widget_linked_layer(widget, layer):
    return widget.layers.filter(pk=layer.id).exists()


@register.filter
def can_set_external(layer):
    """
    Return True if layer type can be called externally from QGIS-server
    I.e. WMS, WMST, Arcgiserver ...
    Check also if service is under authentication.
    """

    cando = False
    if layer.layer_type in [Layer.TYPES.wms]:
        if ('username' not in layer.datasource or 'password' not in layer.datasource) and 'type=xyz' \
                not in layer.datasource:
            cando = True

    return cando