from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from usersmanage.configs import *
from core.utils.general import getAuthPermissionContentType


def add_perms2groups(sender, **kwargs):

    # add new permission type if is not present
    AuthGroup, Permission, ContentType = getAuthPermissionContentType()
    Configs = apps.get_app_config('cdu').get_model('configs')

    editor1 = AuthGroup.objects.get(name=G3W_EDITOR1)
    editor1_permission = editor1.permissions.all()

    permissions_to_add = (
        Permission.objects.get(codename='add_configs', content_type=ContentType.objects.get_for_model(Configs)),
    )

    for perm in permissions_to_add:
        if perm not in editor1_permission:
            editor1.permissions.add(perm)


class cduConfig(AppConfig):

    name = 'cdu'
    verbose_name = 'CDU'

    def ready(self):
        post_migrate.connect(add_perms2groups, sender=self)

        # import signal handlers
        import cdu.receivers
