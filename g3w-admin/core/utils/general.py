from django.apps import apps

def ucfirst(string):
    """
    Capitalize only first letter like php
    :param string:
    :return: string
    """
    return string[0].upper() + string[1:]


def getProjectModels():
    """
    Find project model and returns
    :return:
    """

def getAuthPermissionContentType():
    """
    Return base object model for apps module app
    """
    AuthGroup = apps.get_app_config('auth').get_model('Group')
    Permission = apps.get_app_config('auth').get_model('Permission')
    ContentType = apps.get_app_config('contenttypes').get_model('ContentType')

    return AuthGroup, Permission, ContentType