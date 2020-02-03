from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from usersmanage.configs import *
from core.utils.general import getAuthPermissionContentType
from django.conf import settings

from qgis.core import QgsApplication


# Required only if the installation is not in the default path
# or if virtualenv messes up with the paths
QgsApplication.setPrefixPath("/usr", True)

# create a reference to the QgsApplication
# setting the second argument to True enables the GUI, which we need to do
# since this is a custom application
QGS_APPLICATION = QgsApplication([], False)

# load providers
QGS_APPLICATION.initQgis()


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
