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

    def buidlKeyValue(legModel):
        return [(l.id, l.description) for l in legModel.objects.all()]



    # check il project model and project type are right for iternet
    if kwargs['projectType'] == 'qdjango' and str(data.project.pk) == kwargs['project']:
        ret ={'iternet':{
            'layers': {
                'nodi': {
                    'name': 'giunzione_stradale',
                    'id': layers['giunzione_stradale'].pk
                },
                'archi': {
                    'name': layers['elemento_stradale'].title,
                    'id': layers['elemento_stradale'].pk
                },
                'accessi': {
                    'name': layers['accesso'].title,
                    'id': layers['accesso'].pk
                }

            },
            'baseurl': '/{}/{}'.format(iternetConfig.name,BASE_INTERNET_API_EDITING),
            'forms': {
                'nodi': {
                    'tip_gnz': buidlKeyValue(LegTipGnz),
                    'org': buidlKeyValue(LegOrg)
                },
                'archi': {
                    'cod_sta': buidlKeyValue(LegCodSta),
                    'cod_sed': buidlKeyValue(LegCodSed),
                    'tip_ele': buidlKeyValue(LegTipEle),
                    'cls_tcn': buidlKeyValue(LegClsTcn),
                    'tip_gst': buidlKeyValue(LegTipGst),
                    'sot_pas': buidlKeyValue(LegSotPas),
                    'cmp_ele': buidlKeyValue(LegCmpEle),
                    'org': buidlKeyValue(LegOrg),
                    'cls_lrg': buidlKeyValue(LegClsLrg),
                    'tip_pav': buidlKeyValue(LegTipPav),
                    'one_way': buidlKeyValue(LegOneWay)
                },
                'accessi': {
                    'tip_acc': buidlKeyValue(LegTipAcc),
                },
            }
        }}

        return ret




