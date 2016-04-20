from core.signals import initconfig_plugin_start
from django.dispatch import receiver
from django.db.models.signals import post_save, post_delete
from django.core.exceptions import ObjectDoesNotExist
from .models import *
from .apps import iternetConfig
from .urls import BASE_INTERNET_API_EDITING
from .configs import ITERNET_LAYERS


@receiver(initconfig_plugin_start)
def setInitConfigValue(sender, **kwargs):

    # get config data
    data = Config.getData()

    # if config value is not set return None
    if not data:
        return None

    layers = {d.name:d for d in data.project.layer_set.filter(name__in=ITERNET_LAYERS.keys())}

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


def postSaveMetadataInfo(sender, **kwargs):
    """
    Receiver function for signal post_save for created or updated Accesso, NumeroCivico, GiunzioniStradali,
    ToponimoStradale, ElementoStradale model object.
    Fill accesso_info metadata table
    """

    # select modelInfo to use
    metadataTableInfo = sender.metadataTableInfo()
    instance = kwargs['instance']
    filterData = {metadataTableInfo['fk']: getattr(instance, metadataTableInfo['fk'])}

    if 'created' in kwargs and kwargs['created']:

        # add new row into metadata table 'info'
        ainfo = metadataTableInfo['model'](tip_opz='I', **filterData)
        ainfo.save()
    else:

        tip_opz = 'U' if kwargs['signal'] == post_save else 'D'

        # before check if present
        try:
            ainfo = metadataTableInfo['model'].objects.get(**filterData)
            ainfo.tip_opz = 'U'
            ainfo.save()
        except ObjectDoesNotExist:
            ainfo = metadataTableInfo['model'](tip_opz='U', **filterData)
            ainfo.save()


# connect signals for metadata table info
post_save.connect(postSaveMetadataInfo, sender=Accesso)
post_delete.connect(postSaveMetadataInfo, sender=Accesso)
post_save.connect(postSaveMetadataInfo, sender=NumeroCivico)
post_delete.connect(postSaveMetadataInfo, sender=NumeroCivico)
post_save.connect(postSaveMetadataInfo, sender=ElementoStradale)
post_delete.connect(postSaveMetadataInfo, sender=ElementoStradale)
post_save.connect(postSaveMetadataInfo, sender=ToponimoStradale)
post_delete.connect(postSaveMetadataInfo, sender=ToponimoStradale)
post_save.connect(postSaveMetadataInfo, sender=GiunzioneStradale)
post_delete.connect(postSaveMetadataInfo, sender=GiunzioneStradale)


