import logging
import os
import glob
import importlib

from core.utils.general import getAuthPermissionContentType

from django.apps import AppConfig, apps
from django.dispatch import receiver
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_migrate

from qgis.core import QgsApplication, QgsProject, QgsPathResolver
from qgis.server import QgsServer, QgsServerSettings, QgsConfigCache

from usersmanage.configs import *

logger = logging.getLogger(__name__)
logger_qgis_server = logging.getLogger('qgis.server')

# Custom QGIS Project Cache settings
USE_CUSTOM_CACHE_INVALIDATOR = getattr(
    settings,
    'G3WADMIN_USE_CUSTOM_CACHE_INVALIDATOR',
    False
)

if settings.DEBUG:
    os.environ['QGIS_SERVER_LOG_LEVEL']  = '0'
    os.environ['QGIS_SERVER_LOG_STDERR'] = '1'

# Setup AUTH DB
if hasattr(settings, 'QGIS_AUTH_DB_DIR_PATH') and settings.QGIS_AUTH_DB_DIR_PATH:
    os.environ['QGIS_AUTH_DB_DIR_PATH'] = settings.QGIS_AUTH_DB_DIR_PATH

if hasattr(settings, 'QGIS_AUTH_PASSWORD_FILE') and settings.QGIS_AUTH_PASSWORD_FILE:
    auth_file = settings.QGIS_AUTH_PASSWORD_FILE
    if not os.path.isfile(auth_file):
        if not hasattr(settings, 'QGIS_AUTH_PASSWORD'):
            raise ImproperlyConfigured(
                'QGIS_AUTH_PASSWORD_FILE is set but it does not exist' \
                'and QGIS_AUTH_PASSWORD is not set: either point' \
                'QGIS_AUTH_PASSWORD_FILE to an existing file or define' \
                'a password in QGIS_AUTH_PASSWORD'
            )
        try:
            with open(auth_file, 'w+') as file:
                file.write(settings.QGIS_AUTH_PASSWORD)
                logger.info('QGIS_AUTH_PASSWORD_FILE created as %s' % auth_file)
        except Exception as ex:
            raise ImproperlyConfigured('Error creating QGIS_AUTH_PASSWORD_FILE %s: %s' % (auth_file, ex) )
    os.environ['QGIS_AUTH_PASSWORD_FILE'] = auth_file


# QGIS API objects, initialized in init_qgis()
QGS_APPLICATION     = None
QGS_SERVER_SETTINGS = None
QGS_SERVER          = None

def get_qgis_log(msg, tag, level):
    """
    Function to get QGIS server log message and send to specific python logger
    """

    # Mapping Python logging levels to QGIS logging levels
    # 0 -> INFO
    # 1 -> WARNING
    # 2 -> CRITICAL

    map_log_level = {
        '0': logging.DEBUG,
        '1': logging.WARNING,
        '2': logging.ERROR
    }

    # Put QGIS message log into python loggging system
    logger_qgis_server.log(
        map_log_level[str(level)],
        f'[{tag}] - {msg}'
    )

def init_qgis():
    """QGIS Initialization

    This function must be called exactly once for each server process and
    before using any QGIS API call.
    """

    global QGS_APPLICATION, QGS_SERVER_SETTINGS, QGS_SERVER

    # Create a reference to the QgsApplication
    QGS_APPLICATION = QgsApplication([], False) # False = disable GUI 

    # Load providers
    QGS_APPLICATION.initQgis()

    if hasattr(settings, 'QGIS_AUTH_PASSWORD') and settings.QGIS_AUTH_PASSWORD:
        if QgsApplication.authManager().isDisabled():
            raise ImproperlyConfigured('QGIS AuthManager is not enabled')

        if not QgsApplication.authManager().setMasterPassword(settings.QGIS_AUTH_PASSWORD, True):
            raise ImproperlyConfigured('Error setting QGIS Auth DB master password from settings.QGIS_AUTH_PASSWORD')

    # Manipulate environment variables here
    os.environ['QGIS_SERVER_IGNORE_BAD_LAYERS'] = '1'

    # Create server from settings 
    QGS_SERVER_SETTINGS = QgsServerSettings()
    QGS_SERVER_SETTINGS.load()

    # Singleton server instance (reused across each request)
    QGS_SERVER = QgsServer()

    QGS_APPLICATION.messageLog().messageReceived.connect(get_qgis_log)


def remove_project_from_cache(path: str):
    """Removes a project from server's cache

    :param path: project path
    :type path: str
    """
    QgsConfigCache.instance().removeEntry(path)
    QGS_SERVER.serverInterface().capabilitiesCache().removeCapabilitiesDocument(path)
    logger.warning('QGIS Server project removed from cache: %s' % path)

def formatted_time(mtime: float) -> str:
    import datetime
    return datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')

class ProjectCacheInvalidator():
    """Cache manager that checks the project file last modified time and
    invalidates the project cache if the project has changed.

    This is not required unless the project files reside on a network mounted
    disk which on Linux misses the INOTIFY signal used by the internal QGIS
    Server logic to invalidate the cache.

    WARNING: this logic may introduce a significant slowdown on each server
             request due to the time which is necessary to check the project file
             timestamp.
    """

    __CACHED_PROJECTS = {}

    @classmethod
    def check_cache(cls, path):
        try:
            stat_info = os.stat(path)
        except FileNotFoundError:
            return

        mtime = stat_info.st_mtime
        pid   = os.getpid()
        try:
            if cls.__CACHED_PROJECTS[path] < mtime:
                logger.debug('[DELETE] <%s> %s %s from cache' % (pid, formatted_time(mtime), path))
                remove_project_from_cache(path)
                del(cls.__CACHED_PROJECTS[path])
            else:
                logger.debug('[HIT] <%s> %s %s from cache' % (pid, formatted_time(mtime), path))
        except KeyError:
            logger.debug('[SET] <%s> %s %s into cache' % (pid, formatted_time(mtime), path))
            cls.__CACHED_PROJECTS[path] = mtime

def get_qgs_project(path: str):
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
        # needs rebuilt. This triggers the QGIS server internal cache manager that
        # invalidates the cache if the file has changed. QGIS internal implementation
        # does not work reliably with project that are stored on network mounted
        # volumes, in that case we need to use our own cache manager, enable it with
        # G3WADMIN_USE_CUSTOM_CACHE_INVALIDATOR=True

        # For batch processing running with Huey or Celery, to avoid freezing of task running,
        # is necessary skip the follow line.
        if os.getenv('G3WSUITE_CONSUMER', '0') == '0':
            QgsApplication.instance().processEvents()

        if USE_CUSTOM_CACHE_INVALIDATOR:
            ProjectCacheInvalidator.check_cache(path)

        project = QgsConfigCache.instance().project(path, QGS_SERVER_SETTINGS)

        # This is required after QGIS 3.10.11, see https://github.com/qgis/QGIS/pull/38488#issuecomment-692190106
        if project is not None and project != QgsProject.instance():

            try:
                # Workaround for virtual layers bug  https://github.com/qgis/QGIS/pull/38488#issuecomment-692190106
                QgsProject.setInstance(project)
                needs_reload = False
                for l in list(project.mapLayers().values()):
                    if not l.isValid():
                        logger.warning(
                            'Invalid layer %s found in project %s' %
                            (l.id(), project.fileName())
                        )
                        if l.dataProvider().name() == 'virtual':
                            needs_reload = True
                            logger.warning(
                                'Invalid virtual layer found in project %s: %s' %
                                (project.fileName(), l.publicSource())
                            )
                if needs_reload:
                    logger.warning('Reload project %s' % project.fileName())
                    QgsProject.instance().read(path)
            except AttributeError:  # Temporary workaround for 3.10.10
                logger.warning(
                    'Project reloaded because QgsProject.setInstance() is not available in this QGIS version: %s' %
                    path
                )
                QgsProject.instance().read(path)
        return QgsProject.instance()
    except Exception as ex:
        logger.warning(
            'There was an error loading the project from path: %s,' \
            ' this is normally due to unavailable layers.' \
            ' If this is unexpected, please turn on and check server' \
            ' debug logs for further details.\n%s.' %
            (path, ex)
        )
        return None


def GiveBaseGrant(sender, **kwargs):

    if isinstance(sender, QdjangoConfig):
        AuthGroup, Permission, ContentType = getAuthPermissionContentType()
        Project = apps.get_app_config('qdjango').get_model('project')
        Layer   = apps.get_app_config('qdjango').get_model('layer')
        Widget  = apps.get_app_config('qdjango').get_model('widget')

        editor1           = AuthGroup.objects.get(name = G3W_EDITOR1)
        editor1Permission = editor1.permissions.all()
        editor2           = AuthGroup.objects.get(name = G3W_EDITOR2)
        editor2Permission = editor2.permissions.all()

        permissionsToAdd = (
            Permission.objects.get(
                codename     = 'add_project',
                content_type = ContentType.objects.get_for_model(Project)
            ),
        )

        for perm in permissionsToAdd:
            if perm not in editor1Permission:
                editor1.permissions.add(perm)
            if perm not in editor2Permission:
                editor2.permissions.add(perm)

        # for editor1 and editor2
        permissionsToAdd = (
            Permission.objects.get(
                codename     = 'add_widget',
                content_type = ContentType.objects.get_for_model(Widget)
            ),
        )

        for perm in permissionsToAdd:
            if perm not in editor1Permission:
                editor1.permissions.add(perm)
            if perm not in editor2Permission:
                editor2.permissions.add(perm)


class QdjangoConfig(AppConfig):
    name         = 'qdjango'
    verbose_name = 'QGIS project managment'
    alias        = 'QGIS'
    icon         = 'qdjango/img/qgis-icon32.png'

    def ready(self):

        post_migrate.connect(GiveBaseGrant, sender=self)

        init_qgis()

        # import signals receivers
        import qdjango.receivers

        # Register qdjango catalog record provider
        if 'catalog' in settings.INSTALLED_APPS:
            from catalog.models import Catalog

            from .models import Project
            from .utils.catalog_provider import catalog_provider

            Catalog.register_catalog_record_provider(
                catalog_provider,
                scope   = Catalog.SCOPE.GROUP,
                senders = [Project]
            )

        # Set a path resolver to find data in DATASOURCE_PATH

        # def datasource_processor(path):
        #    return path.replace(
        #       './',
        #       settings.DATASOURCE_PATH if not settings.DATASOURCE_PATH.endswith('/') else (settings.DATASOURCE_PATH + '/')
        #    )

        # QgsPathResolver.setPathPreprocessor(datasource_processor)

        # Load all QGIS server "filter" and "services" plugins,
        # apps can load additional filters and services by
        # registering them directly to QGS_SERVER
        from . import server_filters, server_services

        # Load custom QGIS functions from "qdjango/qgis_functions" directory
        functions_folder = os.path.join(os.path.dirname(__file__), 'qgis_functions')

        for f in glob.glob(functions_folder + '/*.py'):
            if '__init__.py' not in f:
                importlib.import_module('qdjango.qgis_functions.' + os.path.basename(f)[:-3])
