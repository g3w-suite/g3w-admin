from pyproj import Proj, transform

def TransformBBox(epsgFrom, epsgTo, BBox):

    prjFrom = Proj(init="epsg:".format(epsgFrom))
    prjTo = Proj(init="epsg:".format(epsgTo))

    # Todo: implement bbox split and transform


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
        'no geomtry': 'No Geometry'
    }

    return trans[geometry_type.lower()]
