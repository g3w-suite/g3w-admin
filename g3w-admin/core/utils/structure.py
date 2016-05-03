from django.conf import settings
from django.apps import apps

def getProjectsByGroup(group):
    """
    Return queryset projects for groups for every project app
    """

    ret = {}
    for g3wProjectApp in settings.G3WADMIN_PROJECT_APPS:
        Project = apps.get_app_config(g3wProjectApp).get_model('project')
        ret[g3wProjectApp] = Project.objects.filter(group=group)
    return ret