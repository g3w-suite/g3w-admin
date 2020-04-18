from pyproj import Proj, transform

def camel_geometry_type(geometry_type):
    """
    From geometry type case insensitive to standard name
    :param geometry_type: string
    :return: string
    """
    trans = {
        'geometry': 'Geometry',
        'point': 'Point',
        'line': 'LineString',
        'polygon': 'Polygon',
        'multipoint': 'MultiPoint',
        'multilinestring': 'MultiLineString',
        'multipolygon': 'MultiPolygon',
        'no geometry': 'No Geometry'
    }

    return trans[geometry_type.lower()]
