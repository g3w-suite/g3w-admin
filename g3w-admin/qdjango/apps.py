import os
from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from usersmanage.configs import *
from core.utils.general import getAuthPermissionContentType
from django.conf import settings

from qgis.core import QgsApplication, QgsProject
from qgis.server import QgsServer, QgsConfigCache, QgsServerSettings

import logging
logger = logging.getLogger(__name__)

if settings.DEBUG:
    os.environ['QGIS_SERVER_LOG_LEVEL'] = '0'
    os.environ['QGIS_SERVER_LOG_STDERR'] = '1'

# Required only if the installation is not in the default path
# or if virtualenv messes up with the paths
QgsApplication.setPrefixPath("/usr", True)

# create a reference to the QgsApplication
# setting the second argument to True enables the GUI, which we do not need to do
# since this is a custom application
QGS_APPLICATION = QgsApplication([], False)

# load providers
QGS_APPLICATION.initQgis()

# Do any environment manipulation here, before we create the server
# and the settings are read
os.environ['QGIS_SERVER_IGNORE_BAD_LAYERS'] = '1'

QGS_SERVER_SETTINGS = QgsServerSettings()
QGS_SERVER_SETTINGS.load()

# Create a singleton server instance, this is not really necessary but it
# may be a little faster than creating a new instance every time we handle
# a request
QGS_SERVER = QgsServer()


def get_qgs_project(path):
    """Reads and returns a project from the cache, trying to load it
    if it's not there.
    A None is returned if the project could not be loaded.

    :param path: the filesystem path to the project
    :type path: str
    :return: the QgsProject instance or None
    :rtype: QgsProject or None
    """

    try:
        # Call process events in case the project has been updated and the cache
        # needs rebuilt
        QgsApplication.instance().processEvents()
        project = QgsConfigCache.instance().project(path, QGS_SERVER_SETTINGS)
        # This is required after QGIS 3.10.11, see https://github.com/qgis/QGIS/pull/38488#issuecomment-692190106
        if project is not None and project != QgsProject.instance():
            try:
                # Workaround for virtual layers bug  https://github.com/qgis/QGIS/pull/38488#issuecomment-692190106
                QgsProject.setInstance(project)
                for l in list(project.mapLayers().values()):
                    if not l.isValid():
                        if l.dataProvider().name() == 'virtual':
                            project.read(path)
                            logger.warning('Reloaded project (virtual layer found!) %s' % project.fileName())
                            break
                        else:
                            logger.warning('Invalid layer %s found in project %s' % (l.id(), project.fileName()))
            except AttributeError:  # Temporary workaround for 3.10.10
                logger.warning('Project reloaded because QgsProject.setInstance() is not available in this QGIS version: %s' % path)
                QgsProject.instance().read(path)
        return project
    except:
        logger.warning('There was an error loading the project from path: %s, this is normally due to unavailable layers. If this is unexpected, please turn on and check server debug logs for further details.' % path)
        return None


def GiveBaseGrant(sender, **kwargs):

    if isinstance(sender, QdjangoConfig):
        AuthGroup, Permission, ContentType = getAuthPermissionContentType()
        Project = apps.get_app_config('qdjango').get_model('project')
        Layer = apps.get_app_config('qdjango').get_model('layer')
        Widget = apps.get_app_config('qdjango').get_model('widget')

        editor1 = AuthGroup.objects.get(name=G3W_EDITOR1)
        editor1Permission = editor1.permissions.all()
        editor2 = AuthGroup.objects.get(name=G3W_EDITOR2)
        editor2Permission = editor2.permissions.all()

        permissionsToAdd = (
            Permission.objects.get(
                codename='add_project', content_type=ContentType.objects.get_for_model(Project)),
        )

        for perm in permissionsToAdd:
            if perm not in editor1Permission:
                editor1.permissions.add(perm)
            if perm not in editor2Permission:
                editor2.permissions.add(perm)

        # for editor1 and editor2
        permissionsToAdd = (
            Permission.objects.get(
                codename='add_widget', content_type=ContentType.objects.get_for_model(Widget)),
        )

        for perm in permissionsToAdd:
            if perm not in editor1Permission:
                editor1.permissions.add(perm)
            if perm not in editor2Permission:
                editor2.permissions.add(perm)


class QdjangoConfig(AppConfig):
    name = 'qdjango'
    verbose_name = 'QGIS project managment'
    alias = 'QGIS'
    icon = 'qdjango/img/qgis-icon32.png'

    def ready(self):
        post_migrate.connect(GiveBaseGrant, sender=self)

        # import signals receivers
        import qdjango.receivers

        # Register qdjango catalog record provider
        if 'catalog' in settings.INSTALLED_APPS:
            from catalog.models import Catalog
            from .models import Layer, Project
            from .utils.catalog_provider import catalog_provider

            Catalog.register_catalog_record_provider(catalog_provider,
                                                     scope=Catalog.SCOPE.GROUP,
                                                     senders=[Layer, Project])

        # Load all QGIS server filter plugins, apps can load additional filters
        # by registering them directly to QGS_SERVER
        from . import server_filters

        # Load all QGIS server services plugins, apps can load additional services
        # by registering them directly to QGS_SERVER
        from . import server_services
