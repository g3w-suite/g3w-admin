from django.conf import settings
from qgis.core import \
    QgsCoordinateReferenceSystem, \
    QgsDatumTransform, \
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


def get_crs_proj4(crs):
    """Return a Proj4js-compatible definition for a QGIS CRS."""
    proj4 = crs.toProj()
    if '+towgs84=' in proj4:
        return proj4

    wgs84 = QgsCoordinateReferenceSystem('EPSG:4326')
    for operation in QgsDatumTransform.operations(crs, wgs84):
        if not operation.isAvailable or operation.grids:
            continue

        helmert_steps = [
            step.split()
            for step in operation.proj.split('+step')
            if '+proj=helmert' in step.split()
        ]
        if len(helmert_steps) != 1 or '+inv' in helmert_steps[0] or '+exact' in helmert_steps[0]:
            continue

        parameters = {
            token[1:].split('=', 1)[0]: token.split('=', 1)[1]
            for token in helmert_steps[0]
            if token.startswith('+') and '=' in token
        }
        if set(parameters) - {'proj', 'x', 'y', 'z', 'rx', 'ry', 'rz', 's', 'convention'}:
            continue
        if not all(key in parameters for key in ('x', 'y', 'z')):
            continue

        convention = parameters.get('convention', 'position_vector')
        if convention not in ('position_vector', 'coordinate_frame'):
            continue

        towgs84 = [parameters[key] for key in ('x', 'y', 'z')]
        if any(key in parameters for key in ('rx', 'ry', 'rz', 's')):
            rotation_sign = -1 if convention == 'coordinate_frame' else 1
            towgs84.extend(
                str(rotation_sign * float(parameters.get(key, '0')))
                for key in ('rx', 'ry', 'rz')
            )
            towgs84.append(parameters.get('s', '0'))

        return f"{proj4} +towgs84={','.join(towgs84)}"

    return proj4


def get_crs_bbox(crs):
    """
    Give a instance of QgsCoordinateReferenceSystem (crs) return bounds of this crs as list as map units

    :param crs: A QgsCoordinateReferenceSystem instance
    :return: CRS bounds as list as map units
    """

    if not isinstance(crs, QgsCoordinateReferenceSystem):
        crs_id = str(crs)
        crs = QgsCoordinateReferenceSystem(
            crs_id if ':' in crs_id else f'EPSG:{crs_id}'
        )

    if crs.authid().startswith('EPSG:'):
        try:
            epsg = int(crs.authid().split(':', 1)[1])
        except ValueError:
            epsg = None
        if epsg in settings.G3W_PROJ4_EPSG:
            return settings.G3W_PROJ4_EPSG[epsg]['extent']

    if crs.authid() == 'EPSG:4326':
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