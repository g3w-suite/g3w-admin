from django import template
from qdjango.models import Layer, MSG_LEVELS
from qdjango.utils.models import get_geoconstraints4layer


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
    if layer.layer_type in [Layer.TYPES.wms, Layer.TYPES.arcgismapserver] and \
            layer.srid == layer.project.group.srid.srid:
        if ('username' not in layer.datasource or 'password' not in layer.datasource) and 'type=xyz' \
                not in layer.datasource:
            cando = True

    return cando


@register.filter
def is_geom_type_gpx_compatible(layer):
    """
    Return True if layer type can be exported as GPS format.
    """

    return layer.geometrytype not in ['Polygon', 'MultiPolygon', 'NoGeometry', 'MultiPoint']


@register.simple_tag()
def geoconstraitnswidget4layer(layer):
    """
    Return number of geoconstraints widget for layer
    :param layer: Qdjango Layer model instance
    :return: int
    """

    return len(get_geoconstraints4layer(layer))


@register.filter
def message_level(level:int) -> str:
    """
    Translate a message level to a string
    :param level: int, message level
    :return: string message level
    :rtype: str
    """

    # From tuple list to dict
    msg_level = {m[0]: m[1] for m in MSG_LEVELS}
    return msg_level[level]

@register.simple_tag()
def fieldsnumber(layer):
    """
    Return number of fields for layer
    :param layer: Qdjango Layer model instance
    :return: int
    """

    try:
        return len(layer.database_columns_by_name().keys())
    except:
        return 0