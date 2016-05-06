from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from usersmanage.configs import *
from core.utils.general import getAuthPermissionContentType


def GiveBaseGrant(sender, **kwargs):

    if isinstance(sender, LawConfig):
        AuthGroup, Permission, ContentType = getAuthPermissionContentType()
        Laws = apps.get_app_config('law').get_model('Laws')

        editor1 = AuthGroup.objects.get(name=G3W_EDITOR1)
        editor1Permission = editor1.permissions.all()
        editor2 = AuthGroup.objects.get(name=G3W_EDITOR2)
        editor2Permission = editor2.permissions.all()

        lawContentType = ContentType.objects.get_for_model(Laws)
        permissionsToAdd = (
            Permission.objects.get(codename='view_laws', content_type=lawContentType),
        )

        for perm in permissionsToAdd:
            if perm not in editor1Permission:
                editor1.permissions.add(perm)
            if perm not in editor2Permission:
                editor2.permissions.add(perm)

        # only to editor1
        permissionsToAdd = (
            Permission.objects.get(codename='add_laws', content_type=lawContentType),
        )

        for perm in permissionsToAdd:
            if perm not in editor1Permission:
                editor1.permissions.add(perm)


class LawConfig(AppConfig):
    name = 'law'
    verbose_name = 'Law project managment'

    def ready(self):
        post_migrate.connect(GiveBaseGrant, sender=self)