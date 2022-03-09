from django.apps import apps
from usersmanage.configs import *

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

