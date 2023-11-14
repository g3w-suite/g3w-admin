
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
                #print ("{} already in database".format(gname))

        # give permissions to Editor Level 1
        editorPermission = agroup.permissions.all()
        permissionsToAdd = (
            Permission.objects.get(codename='add_user'),
            Permission.objects.get(codename='add_group', content_type=ContentType.objects.get_for_model(Group)),

        )
        for perm in permissionsToAdd:
            if perm not in editorPermission:
                agroup.permissions.add(perm)


class UsersmanageConfig(AppConfig):
    name = 'usersmanage'
    verbose_name = 'Users Manager'

    def ready(self):

        # Activate signals receivers
        import usersmanage.receivers

        post_migrate.connect(GiveBaseGrant, sender=self)