from core.signals import initconfig_plugin_start
from django.dispatch import receiver
from .models import *
from .apps import iternetConfig
from .urls import BASE_INTERNET_API_EDITING
from client.utils.editing import editingFormField


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
            'gid': "{}:{}".format(kwargs['projectType'],kwargs['project']),
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
                    'fields': [
                        editingFormField('tip_gnz',inputType='select', values=buidlKeyValue(LegTipGnz)),
                        editingFormField('org', inputType='select', values=buidlKeyValue(LegOrg))
                    ],
                },
                'archi': [
                    editingFormField('cod_sta', inputType='select', values=buidlKeyValue(LegCodSta)),
                    editingFormField('cod_sed', inputType='select', values=buidlKeyValue(LegCodSed)),
                    editingFormField('tip_ele', inputType='select', values=buidlKeyValue(LegTipEle)),
                    editingFormField('cls_tcn', inputType='select', values=buidlKeyValue(LegClsTcn)),
                    editingFormField('tip_gst', inputType='select', values=buidlKeyValue(LegTipGst)),
                    editingFormField('sot_pas', inputType='select', values=buidlKeyValue(LegSotPas)),
                    editingFormField('cmp_ele', inputType='select', values=buidlKeyValue(LegCmpEle)),
                    editingFormField('org', inputType='select', values=buidlKeyValue(LegOrg)),
                    editingFormField('cls_lrg', inputType='select', values=buidlKeyValue(LegClsLrg)),
                    editingFormField('tip_pav', inputType='select', values=buidlKeyValue(LegTipPav)),
                    editingFormField('one_way', inputType='select', values=buidlKeyValue(LegOneWay))
                ],
                'accessi': [
                    editingFormField('tip_acc', inputType='select', values=buidlKeyValue(LegTipAcc))
                ],
            }
        }}

        return ret




