# coding=utf-8
""""Huey tasks for Openrouteservice

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-29'
__copyright__ = 'Copyright 2021, Gis3W'

from functools import wraps

from django.db import close_old_connections
from huey.contrib.djhuey import HUEY
from huey_monitor.tqdm import ProcessInfo

from .utils import isochrone_from_layer

task = HUEY.task


def close_db(fn):
    """Decorator called by db_task() to be used with tasks that may operate
    on the database.

    This implementation is a copy of djhuey implementation but it falls
    back to noop when HUEY.testing is True.

    Set HUEY.testing to True to skip DB connection close.

    """

    @wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        finally:
            if not HUEY.immediate and not getattr(HUEY, 'testing', False):
                close_old_connections()
    return inner


def db_task(*args, **kwargs):
    """Decorator to be used with tasks that may operate on the database.

    This implementation is a copy of djhuey implementation but it falls
    back to noop when HUEY.testing is True.

    Set HUEY.testing to True to skip DB connection close.

    """

    def decorator(fn):
        ret = task(*args, **kwargs)(close_db(fn))
        ret.call_local = fn
        return ret
    return decorator


@db_task(context=True)
def isochrone_from_layer_task(input_qgis_layer_id, profile, params, project_id, qgis_layer_id, connection_id, new_layer_name, name, style, task):
    """Generate isochrones asynchronously from an input QGIS point layer.
    This function must be run as an asynchronous task.

    Expected params (dict):

        {
            "locations" null,  // <-- will be populated in batches by the function
            "range_type":"time",
            "range":[480],
            "interval":60,
            "location_type":"start",
            "attributes":[
                "area",
                "reachfactor",
                "total_pop"
            ]
        }

    * "range": Maximum range value of the analysis in seconds for time and metres for distance.
               Alternatively a comma separated list of specific single range values.

    * "locations": The locations to use for the route as an array of longitude/latitude pairs

    Returns: {'qgis_layer_id': qgis_layer_id}

    :param input_qgis_layer_id: QGIS layer ID of the points layer which contains the locations for the isochrones
    :type input_qgis_layer_id: str
    :param profile: ORS profile (such as `driving-car`)
    :type profile: str
    :param params: ORS params
    :type profile: str
    :param project_id: QDjango Project pk for the new or the existing layer
    :type project: int
    :param layer_id: optional, QGIS layer id
    :type layer_id: QGIS layer id
    :param connection_id: optional, connection id or the special value `__shapefile__`, `__spatialite__` or `__geopackage__`
    :type connection: str
    :param new_layer_name: optional, name of the new layer
    :type new_layer_name: str
    :param name: optional, name of the isochrone, default to current datetime
    :type name: str
    :param style: optional, dictionary with style properties: example {'color': [100, 50, 123], 'transparency': 0.5, 'stroke_width: 3 }
    :type style: dict
    :raises Exception: raise on error
    :rtype: dict

    """

    process_info = ProcessInfo(
        task,
        desc='Isochrones from layer'
    )

    return isochrone_from_layer(input_qgis_layer_id, profile, params, project_id, qgis_layer_id, connection_id, new_layer_name, name, style, process_info)
