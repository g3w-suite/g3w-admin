from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from usersmanage.configs import *
from core.utils.general import getAuthPermissionContentType
try:
    from qgis.core import *
except:
    pass

'''
QgsApplication.setPrefixPath("/path/to/qgis/installation", True)

# create a reference to the QgsApplication
# setting the second argument to True enables the GUI, which we need to do
# since this is a custom application
QGS_APPLICATION = QgsApplication([], True)

# load providers
QGS_APPLICATION.initQgis()
'''


def GiveBaseGrant(sender, **kwargs):

    if isinstance(sender, QdjangoConfig):
        AuthGroup, Permission, ContentType = getAuthPermissionContentType()
        Project = apps.get_app_config('qdjango').get_model('project')
        Layer = apps.get_app_config('qdjango').get_model('layer')

        editor1 = AuthGroup.objects.get(name=G3W_EDITOR1)
        editor1Permission = editor1.permissions.all()
        editor2 = AuthGroup.objects.get(name=G3W_EDITOR2)
        editor2Permission = editor2.permissions.all()

        permissionsToAdd = (
            Permission.objects.get(codename='add_project', content_type=ContentType.objects.get_for_model(Project)),
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

        # import signals receivers
        import qdjango.receivers


