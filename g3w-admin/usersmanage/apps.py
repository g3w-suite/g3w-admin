
from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from .configs import *


def GiveBaseGrant(sender, **kwargs):
    """
    Insert group base in to database, and give base permissions
    """

    if isinstance(sender, UsersmanageConfig):
        AuthGroup = apps.get_app_config('auth').get_model('Group')
        Permission = apps.get_app_config('auth').get_model('Permission')
        ContentType = apps.get_app_config('contenttypes').get_model('ContentType')
        Group = apps.get_app_config('core').get_model('Group')

        # add base group to g3w-admin database
        for gname in (G3W_VIEWER2, G3W_VIEWER1, G3W_EDITOR2, G3W_EDITOR1):
            agroup, created = AuthGroup.objects.get_or_create(name=gname)
            if not created:
                pass

        editor1_group = AuthGroup.objects.get(name=G3W_EDITOR1)
        permissions_to_add = (
            Permission.objects.get(codename='add_user'),
            Permission.objects.get(codename='add_group', content_type=ContentType.objects.get_for_model(Group)),
        )
        editor1_group.permissions.add(*permissions_to_add)
        AuthGroup.objects.get(name=G3W_EDITOR2).permissions.add(permissions_to_add[1])


class UsersmanageConfig(AppConfig):
    name = 'usersmanage'
    verbose_name = 'Users Manager'

    def ready(self):

        # Activate signals receivers
        import usersmanage.receivers

        post_migrate.connect(GiveBaseGrant, sender=self)