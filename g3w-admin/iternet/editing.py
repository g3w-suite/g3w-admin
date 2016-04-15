from client.utils.editing import *
from .models import *
from .utils import getLayerIternetIdByName


def buidlKeyValue(legModel):
    return [{'key': l.id, 'value': l.description} for l in legModel.objects.all()]


def getForms():

    return {
        'giunzione_stradale': {
            'fields': {
                'gid': {'editable': False},
                'cod_gnz': {'editable': False},
                'tip_gnz': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipGnz)}}},
                'org': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOrg)}}}
            }
        },
        'elemento_stradale': {
            'fields': {
                'gid': {'editable': False},
                'cod_ele': {'editable': False},
                'nod_ini': {'required': True, 'input': {'type': FORM_FIELD_TYPE_LAYERPICKER, 'options': {
                    'layerid': getLayerIternetIdByName('giunzione_stradale'),
                    'field': 'cod_gnz'
                }}},
                'nod_fin': {'required': True, 'input': {'type': FORM_FIELD_TYPE_LAYERPICKER, 'options': {
                    'layerid': getLayerIternetIdByName('giunzione_stradale'),
                    'field': 'cod_gnz'
                }}},
                'cod_sta': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCodSta)}}},
                'cod_sed': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCodSed)}}},
                'tip_ele': {'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipEle)}}},
                'cls_tcn': {'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegClsTcn)}}},
                'tip_gst': {'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipGst)}}},
                'cod_gst': {'required': True},
                'lng': {'required': True},
                'cod_top': {'required': True},
                'sot_pas': {'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegSotPas)}}},
                'cmp_ele': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCmpEle)}}},
                'org': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOrg)}}},
                'cls_lrg': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegClsLrg)}}},
                'tip_pav': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipPav)}}},
                'one_way': {'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOneWay)}}}
            }
        },
        'accesso': {
            'fields': {
                'gid': {'editable': False},
                'cod_acc': {'editable': False},
                'cod_ele': {'required': True, 'input': {'type': FORM_FIELD_TYPE_LAYERPICKER, 'options': {
                    'layerid': getLayerIternetIdByName('elemento_stradale'),
                    'field': 'cod_ele'
                }}},
                'tip_acc': {'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipAcc)}}},
                'pas_car': {'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegPasCar)}}}
            }
        }
    }


def getRelationForms():

    return  {
        'accesso': {
            'numero_civico': {
                'fk': [
                    'cod_acc',
                    'tip_acc'
                ],
                'url': '/iternet/api/numero_civico/',
                'fields': [
                    editingFormField('cod_civ', editable=False),
                    editingFormField('num_civ', inputType=FORM_FIELD_TYPE_TEXT, required=True),
                    editingFormField('esp_civ'),
                    editingFormField('cod_top', required=True, inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                        'layerid': getLayerIternetIdByName('elemento_stradale'),
                        'field': 'cod_top'
                    }),
                    editingFormField('cod_com', required=True, inputType=FORM_FIELD_TYPE_SELECT, values=[{'key': l.cod_catastale, 'value': l.denominazione} for l in Comuni.objects.all()], default=settings.ITERNET_CODE_COMUNE),
                    editingFormField('cod_acc_est', required=True, inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                        'layerid': getLayerIternetIdByName('accesso'),
                        'field': 'cod_acc'
                    }),
                    editingFormField('cod_acc_int', editable=False),
                    editingFormField('cod_classifica', inputType=FORM_FIELD_TYPE_SELECT, values=buidlKeyValue(LegCodClassifica))
                ]
            }
        },
        'elemento_stradale': {
            'toponimo_stradale': {
                'fk': [
                    'cod_top'
                ],
                'url': '',
                'fields': [
                    editingFormField('cod_top', editable=False),
                    editingFormField('cod_dug', inputType=FORM_FIELD_TYPE_SELECT, values=buidlKeyValue(LegCodDug)),
                    editingFormField('def_uff'),
                    editingFormField('cod_com'),
                    editingFormField('cod_via')
                ]

            }
        }
    }