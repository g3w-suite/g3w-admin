
from django.conf import settings
from django.template import loader
from django.urls import reverse
import os
import shutil
import glob
from logging import getLogger
from qgis.core import QgsCoordinateReferenceSystem, QgsCoordinateTransform

logger = getLogger("g3wadmin.debug")


def _get_supported_srs(layer):
    srs = layer.project.group.srid.auth_name + ':' + str(layer.project.group.srid.auth_srid)
    supported_srs = ['CRS:84', 'EPSG:4326', 'EPSG:3857']

    if srs not in supported_srs:
        supported_srs.append(srs)

    return supported_srs

def upsert_cached_layer(mapproxy_layer):
    """Creates the configuration or updates an existing one."""

    layer = mapproxy_layer.layer

    layer_file_name = "mapproxy_conf_%s.yaml" % layer.id
    layer_file_path = os.path.join(settings.MAPPROXY_BRIDGE_SHARED_FOLDER_PATH, layer_file_name)

    srs = layer.project.group.srid.auth_name + ':' + str(layer.project.group.srid.auth_srid)
    supported_srs = _get_supported_srs(layer)

    crs = QgsCoordinateReferenceSystem.fromProj(layer.project.group.srid.proj4text)
    bounds_4326 = crs.bounds()
    ct = QgsCoordinateTransform(layer.qgis_layer.crs(), QgsCoordinateReferenceSystem('EPSG:4326'), layer.project.qgis_project)
    layer_extent_4326 = ct.transformBoundingBox(layer.qgis_layer.extent())
    actual_extent_4326 = layer_extent_4326.intersect(bounds_4326)

    has_localgrid = srs not in ['EPSG:900913', 'EPSG:4326', 'EPSG:3857']

    # Load template from file
    template = loader.get_template('mapproxy/mapproxy_conf.yaml')
    context = {
        'layer': layer,
        'ows_url': settings.QDJANGO_SERVER_URL + reverse('OWS:ows', args=[layer.project.group.slug, 'qdjango', layer.project_id]),
        'supported_srs': str(supported_srs),
        'srs': srs,
        'bbox_4326': actual_extent_4326.toString().replace(' : ', ','),
        'title': layer.title.replace("'", "\'"),
        'abstract': layer.description.replace("'", "\'"),
        'has_localgrid': has_localgrid
    }

    mapproxy_conf = template.render(context)

    # Create mapproxy config file
    with open(layer_file_path, 'w') as f:
        f.write(mapproxy_conf)
        logger.debug("MapProxy config file created: %s" % layer_file_path)

def invalidate_cache(mapproxy_layer):
    """Invalidate mapproxy cache."""

    delete_cache(mapproxy_layer)
    upsert_cached_layer(mapproxy_layer)


def delete_cache(mapproxy_layer):
    """Delete mapproxy config file and cached data"""

    layer = mapproxy_layer.layer

    layer_file_name = "mapproxy_conf_%s.yaml" % layer.id
    layer_file_path = os.path.join(settings.MAPPROXY_BRIDGE_SHARED_FOLDER_PATH, layer_file_name)

    # Remove mapproxy config file
    if os.path.isfile(layer_file_path):
        os.remove(layer_file_path)
        logger.debug("MapProxy config file removed: %s" % layer_file_path)
        # Remove all caches
        for srs_cache_folder in glob.glob(os.path.join(settings.MAPPROXY_BRIDGE_SHARED_FOLDER_PATH, 'cache_data', f'{layer.name}_{layer.pk}_cache_*')):
            if os.path.isdir(srs_cache_folder):
                shutil.rmtree(srs_cache_folder)
                logger.debug("MapProxy cache folder removed: %s" % srs_cache_folder)

