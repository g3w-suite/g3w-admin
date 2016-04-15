from client.utils.editing import *
from .models import *
from .utils import getLayerIternetIdByName
from django.core.urlresolvers import reverse

def buidlKeyValue(legModel):
    return [{'key':l.id, 'value':l.description} for l in legModel.objects.all()]

forms = {
    'giunzione_stradale': {
        'fields': {
            'tip_gnz': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipGnz)}}},
            'org': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOrg)}}}
        }
    },
    'elemento_stradale': {
        'fields': {
            'cod_sta': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCodSta)}}},
            'cod_sed': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCodSed)}}},
            'tip_ele': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipEle)}}},
            'cls_tcn': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegClsTcn)}}},
            'tip_gst': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipGst)}}},
            'sot_pas': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegSotPas)}}},
            'cmp_ele': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCmpEle)}}},
            'org': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOrg)}}},
            'cls_lrg': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegClsLrg)}}},
            'tip_pav': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipPav)}}},
            'one_way': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOneWay)}}}
        }
    },
    'accesso': {
        'fields': {
            'tip_acc': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipAcc)}}}
        }
    }
}

relationForms = {
    'accesso': {
        'numero_civico': {
            'fk': [
                'cod_acc',
                'tip_acc'
            ],
            'url': '/iternet/api/numero_civico/',
            'fields': [
                editingFormField('cod_civ'),
                editingFormField('num_civ', inputType=FORM_FIELD_TYPE_TEXT),
                editingFormField('esp_civ'),
                editingFormField('cod_top', inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                    'layerid': getLayerIternetIdByName('elemento_stradale'),
                    'field': 'cod_top'
                }),
                editingFormField('cod_com', default=settings.ITERNET_CODE_COMUNE),
                editingFormField('cod_acc_est', inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                    'layerid': getLayerIternetIdByName('accesso'),
                    'field': 'cod_acc'
                }),
                editingFormField('cod_acc_int', inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                    'layerid': getLayerIternetIdByName('accesso'),
                    'field': 'cod_acc'
                }),
                editingFormField('cod_classifica', inputType=FORM_FIELD_TYPE_SELECT, values=buidlKeyValue(LegCodClassifica))
            ]
        }
    }
}