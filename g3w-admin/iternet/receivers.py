from core.signals import initconfig_plugin_start
from django.dispatch import receiver
from .models import *
from .apps import iternetConfig
from .urls import BASE_INTERNET_API_EDITING


@receiver(initconfig_plugin_start)
def setInitConfigValue(sender, **kwargs):

    # get config data
    data = Config.getData()

    # if config value is not set return None
    if not data:
        return None

    layers = {d.name:d for d in data.project.layer_set.filter(name__in=['accesso','elemento_stradale','giunzione_stradale'])}

    # check il project model and project type are right for iternet
    if kwargs['projectType'] == 'qdjango' and str(data.project.pk) == kwargs['project']:
        ret ={'iternet':{
            'gid': "{}:{}".format(kwargs['projectType'],kwargs['project']),
            'layers': {
                'giunzioni': {
                    'name': layers['giunzione_stradale'].name,
                    'id': layers['giunzione_stradale'].qgs_layer_id
                },
                'strade': {
                    'name': layers['elemento_stradale'].name,
                    'id': layers['elemento_stradale'].qgs_layer_id
                },
                'accessi': {
                    'name': layers['accesso'].name,
                    'id': layers['accesso'].qgs_layer_id
                }

            },
            'baseurl': '/{}/{}'.format(iternetConfig.name,BASE_INTERNET_API_EDITING)
        }}

        return ret




