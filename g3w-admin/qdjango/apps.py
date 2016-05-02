from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from usersmanage.configs import *


def GiveBaseGrant(sender, **kwargs):

    AuthGroup = apps.get_app_config('auth').get_model('Group')
    Permission = apps.get_app_config('auth').get_model('Permission')
    ContentType = apps.get_app_config('contenttypes').get_model('ContentType')
    Project = apps.get_app_config('qdjango').get_model('project')
    Layer = apps.get_app_config('qdjango').get_model('layer')

    editor1 = AuthGroup.objects.get(name=G3W_EDITOR1)
    editor1Permission = editor1.permissions.all()
    editor2 = AuthGroup.objects.get(name=G3W_EDITOR2)
    editor2Permission = editor2.permissions.all()

    permissionsToAdd = (
        Permission.objects.get(codename='add_qdjango_project', content_type=ContentType.objects.get_for_model(Project)),
    )

    for perm in permissionsToAdd:
        if perm not in editor1Permission:
            editor1.permissions.add(perm)
        if perm not in editor2Permission:
            editor2.permissions.add(perm)


class QdjangoConfig(AppConfig):
    name = 'qdjango'
    verbose_name = 'Qgis project managment'

    def ready(self):
        post_migrate.connect(GiveBaseGrant, sender=self)