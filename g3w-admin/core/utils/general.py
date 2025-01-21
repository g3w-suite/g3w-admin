from django.apps import apps
from django import __version__
from usersmanage.configs import *
from qgis.PyQt.QtCore import qVersion
from qgis.core import Qgis
from osgeo import __version__ as GDAL_version
from pyproj import __version__ as PyProj_version, proj_version_str
from django.contrib.gis import geos
from django.db import connections
import distro
import sys


def ucfirst(string):
    """
    Capitalize only first letter like php
    :param string:
    :return: string
    """
    return string[0].upper() + string[1:]


def getAuthPermissionContentType():
    """
    Return base object model for apps module app
    """
    AuthGroup = apps.get_app_config('auth').get_model('Group')
    Permission = apps.get_app_config('auth').get_model('Permission')
    ContentType = apps.get_app_config('contenttypes').get_model('ContentType')

    return AuthGroup, Permission, ContentType


def get_adminlte_skin_by_user(user):
    """
    Return css adminLte skin class by user
    """

    groupsUser = user.groups.values_list('name', flat=True)
    if user.is_superuser and user.is_staff:
        return 'yellow'
    elif user.is_superuser:
        return 'red'
    elif G3W_EDITOR1 in groupsUser or G3W_EDITOR2 in groupsUser:
        return 'purple'
    elif G3W_VIEWER1 in groupsUser or G3W_VIEWER2 in groupsUser:
        return 'green'


def clean_for_json(json_string):
    """Clean a raw python dict string for json.loads"""

    return json_string.replace("False", "false").\
        replace("True", "true").\
        replace(": '", ": \""). \
        replace("',", "\","). \
        replace("'}", "\"}"). \
        replace("\'", "'")


def get_system_info():
    """
    Return a dict with system and  libraries information
    :return:
    """

    ret = {}

    # Make data structure
    for d in ('QGIS', 'Python', 'OS', 'DB', 'Libraries'):
        if not ret.get(d):
            ret.update({
                d: {}
            })
    for d in ('General', 'Geo', 'Python'):
        if not ret['Libraries'].get(d):
            ret['Libraries'].update({
                d: {}
            })

    # QGIS
    # --
    ret['QGIS'].update({
        'v': Qgis.QGIS_VERSION
    })

    # Python
    # --
    ret['Python'].update({
        'v': sys.version
    })

    # OS
    # --
    ret['OS'].update({
        'v': distro.name(pretty=True)
    })

    # PostgreSQL/postgis
    db = []
    for c in connections:
        try:
            with connections[c].cursor() as cursor:
                cursor.execute("SELECT version();")  # Here
                pg_version = cursor.fetchone()[0]

                if connections[c].settings_dict['ENGINE'] == 'django.contrib.gis.db.backends.postgis':
                    cursor.execute("SELECT postgis_version();")
                    pg_version = f"{pg_version} | PostGIS {cursor.fetchone()[0]}"
                db.append({
                    'db_name': c,
                    'v': pg_version
                })
        except:
            pass

    ret['DB'].update({
        'items': db
    })

    # Libraries
    # --
    ret['Libraries']['General'].update({
        'Qt': {
            'v': qVersion()
        }
    })

    ret['Libraries']['Python'].update({
        'Django': {
            'v': __version__
        },
        'GDAL_OGR': {
            'v': GDAL_version
        },
        'PyProj': {
            'v': PyProj_version
        }
    })

    ret['Libraries']['Geo'].update({
        'GDAL_OGR': {
            'v': GDAL_version
        },
        'PROJ': {
            'v': proj_version_str,
        },
        'GEOS': {
            'v': geos.geos_version(),
        },
    })

    return ret