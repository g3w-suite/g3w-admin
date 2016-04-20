from django.core.urlresolvers import reverse
from client.utils.editing import *
from .models import *
from .utils import getLayerIternetIdByName


def buidlKeyValue(legModel):
    return [{'key': l.id, 'value': u'({}) {}'.format(l.id, l.description)} for l in legModel.objects.all()]


def getForms():

    return {
        'giunzione_stradale': {
            'fields': {
                'gid': {'editable': False},
                'cod_gnz': {'editable': False, 'label': 'Codice'},
                'tip_gnz': {'label': 'Tipo', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipGnz)}}},
                'org': {'label': 'Organizzazione', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOrg)}}}
            }
        },
        'elemento_stradale': {
            'fields': {
                'gid': {'editable': False},
                'cod_ele': {'editable': False, 'label': 'Codice'},
                'nod_ini': {'label': 'Codice Nodo Iniziale', 'required': True, 'input': {'type': FORM_FIELD_TYPE_LAYERPICKER, 'options': {
                    'layerid': getLayerIternetIdByName('giunzione_stradale'),
                    'field': 'cod_gnz'
                }}},
                'nod_fin': {'label': 'Codice Nodo Finale', 'required': True, 'input': {'type': FORM_FIELD_TYPE_LAYERPICKER, 'options': {
                    'layerid': getLayerIternetIdByName('giunzione_stradale'),
                    'field': 'cod_gnz'
                }}},
                'cod_sta': {'label': 'Stato di Esercizio', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCodSta)}}},
                'cod_sed': {'label': 'Sede', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCodSed)}}},
                'tip_ele': {'label': 'Tipo', 'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipEle)}}},
                'cls_tcn': {'label': 'Classe Tecnico Funzionale', 'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegClsTcn)}}},
                'tip_gst': {'label': 'Tipo Gestione', 'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipGst)}}},
                'cod_gst': {'label': 'Codice Gestione', 'required': True},
                'lng': {'label': 'Lunghezza', 'required': True},
                'cod_top': {'label': 'Codice Toponimo', 'required': True, 'editable': False},
                'cod_top2': {'label': 'Codice Toponimo 2', 'required': False, 'editable': False},
                'cod_reg': {'label': 'Codice Regionale', 'required': False },
                'sot_pas': {'label': 'Sotto Passo', 'required': True, 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegSotPas)}}},
                'cmp_ele': {'label': 'Composizione', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegCmpEle)}}},
                'org': {'label': 'Origine del dato', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOrg)}}},
                'cls_lrg': {'label': 'Classe di Larghezza', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegClsLrg)}}},
                'tip_pav': {'label': 'Tipo Pavimentazione', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipPav)}}},
                'one_way': {'label': 'Direzione del traffico', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegOneWay)}}}
            }
        },
        'accesso': {
            'fields': {
                'gid': {'editable': False},
                'cod_acc': {'editable': False, 'label': 'Codice'},
                'cod_ele': {'required': True, 'label': 'Codice Elemento Stradale', 'input': {'type': FORM_FIELD_TYPE_LAYERPICKER, 'options': {
                    'layerid': getLayerIternetIdByName('elemento_stradale'),
                    'field': 'cod_ele'
                }}},
                'tip_acc': {'required': True, 'label': 'Tipo Accesso', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegTipAcc)}}},
                'pas_car': {'required': True, 'label': 'Passo Carrabile', 'input': {'type': FORM_FIELD_TYPE_SELECT, 'options': {'values': buidlKeyValue(LegPasCar)}}}
            }
        }
    }


def getRelationForms():

    comuniList = [{'key': l.cod_catastale, 'value': '({}) {}'.format(l.cod_catastale, l.denominazione)} for l in
                  Comuni.objects.all()]

    return  {
        'accesso': {
            'numero_civico': {
                'fk': [
                    'cod_acc',
                    'tip_acc'
                ],
                'url': reverse('iternet-api-civici'),
                'fields': [
                    editingFormField('cod_civ', fieldLabel='Codice', editable=False),
                    editingFormField('num_civ', fieldLabel='Numero', inputType=FORM_FIELD_TYPE_TEXT, required=True),
                    editingFormField('esp_civ', fieldLabel='Esponente'),
                    editingFormField('cod_top', fieldLabel='Codice Toponimo',
                                     required=True, inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                        'layerid': getLayerIternetIdByName('elemento_stradale'),
                        'field': 'cod_top'
                    }),
                    editingFormField('cod_com', fieldLabel='Comune',
                                     required=True, inputType=FORM_FIELD_TYPE_SELECT, values=comuniList,
                                     default=settings.ITERNET_CODE_COMUNE),
                    editingFormField('cod_acc_est', fieldLabel='Codice Accesso Esterno',
                                     required=True, inputType=FORM_FIELD_TYPE_LAYERPICKER, pickerdata={
                        'layerid': getLayerIternetIdByName('accesso'),
                        'field': 'cod_acc'
                    }),
                    editingFormField('cod_acc_int', fieldLabel='Codice Accesso Interno',
                                     editable=False),
                    editingFormField('cod_classifica', fieldLabel='Classifica',
                                     inputType=FORM_FIELD_TYPE_SELECT, values=buidlKeyValue(LegCodClassifica))
                ]
            }
        },
        'elemento_stradale': {
            'toponimo_stradale': {
                'fk': [
                    'cod_top'
                ],
                'url': reverse('iternet-api-toponimi'),
                'fields': [
                    editingFormField('cod_top', fieldLabel='Codice', editable=False),
                    editingFormField('cod_dug', fieldLabel='Tipo', inputType=FORM_FIELD_TYPE_SELECT, values=buidlKeyValue(LegCodDug)),
                    editingFormField('den_uff', fieldLabel='Denominazione Ufficiale'),
                    editingFormField('cod_com', fieldLabel='Comune', required=True, inputType=FORM_FIELD_TYPE_SELECT,
                                     values=comuniList, default=settings.ITERNET_CODE_COMUNE),
                    editingFormField('cod_via', fieldLabel='Codice Comunale')
                ]

            }
        }
    }