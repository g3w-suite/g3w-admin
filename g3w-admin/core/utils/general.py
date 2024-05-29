from django.apps import apps
from django import __version__
from usersmanage.configs import *
from qgis.PyQt.QtCore import qVersion
from qgis.core import Qgis
from osgeo import __version__ as GDAL_version
from pyproj import __version__ as PyProj_version, proj_version_str
from django.contrib.gis import geos
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
    Return a tict with system and  libraries information
    :return: list

    I.e.
    {'QGIS': {'version': "3.34.7-Prizren 'Prizren' (6f7d735cae3)"},
     'Libraries': {
      'Qt': {'version': '5.15.3'},
      'GDAL/OGR': {'version': '3.4.1'},
      'PROJ': {'version': '8.2.1'},
      'EPSG Registry database': {'version': 'v10.041 (2021-12-03)'},
      'GEOS': {'version': '3.10.2-CAPI-1.16.0'},
      'SQLite': {'version': '3.37.2'}
      },
     'Python': {'version': '3.10.12'},
     'OS': {'version': 'buntu 22.04.4 LTS'}
     }
    """


    ret = {}

    # Make data structure
    for d in ('QGIS', 'Python', 'Libraries'):
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