from django.conf import settings
from qgis.core import \
    QgsCoordinateReferenceSystem,  \
    QgsCoordinateReferenceSystem, \
    QgsCoordinateTransformContext, \
    QgsCoordinateTransform

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


def get_crs_bbox(crs):
    """
    Give a instance of QgsCoordinateReferenceSystem (crs) return bounds of this crs as list as map units

    :param crs: A QgsCoordinateReferenceSystem instance
    :return: CRS bounds as list as map units
    """

    if not isinstance(crs, QgsCoordinateReferenceSystem):
        crs = QgsCoordinateReferenceSystem(f'EPSG:{crs}')

    # Patch for Proj4 > 4.9.3 version
    # Get from settings is custom
    if crs.authid()[5:] in settings.G3W_PROJ4_EPSG.keys():
        return settings.G3W_PROJ4_EPSG[crs.authid()[5:]]['extent']

    if crs.postgisSrid() == '4326':
        bbox = crs.bounds()
    else:
        from_srid = QgsCoordinateReferenceSystem('EPSG:4326')
        ct = QgsCoordinateTransform(from_srid, crs, QgsCoordinateTransformContext())
        bbox = ct.transform(crs.bounds())
    return [
        bbox.xMinimum(),
        bbox.yMinimum(),
        bbox.xMaximum(),
        bbox.yMaximum()
    ]