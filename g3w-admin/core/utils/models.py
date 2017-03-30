from django.contrib.gis.db.models import GeometryField


def get_geometry_column(geomodel):
    """
    From GeoDjango model instance return GeometryField instance,
    check if model has only one geometry column
    :param geomodel: Geodjango model instance
    :return: Geodjango GeometryField instance
    """
    geo_fields = list()
    fields = geomodel._meta.get_fields()

    for f in fields:
        if isinstance(f, GeometryField):
            geo_fields.append(f)

    # check hao many columns are geomentry colummns:
    if len(geo_fields) > 1:
        raise Exception('Model has more then one geometry column {}'.format(', '.join([f.name for f in geo_fields])))

    return geo_fields[0]