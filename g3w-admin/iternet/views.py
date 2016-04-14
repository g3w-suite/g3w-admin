from django.views.generic import TemplateView, FormView, View
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.db import IntegrityError, transaction
import copy
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, APIException
from .models import ElementoStradale, Config, Accesso, ElementoStradale, GiunzioneStradale
from .forms import ConfigForm
from qdjango.utils.data import QgisPgConnection
from rest_framework_gis.filters import InBBoxFilter
from .configs import ITERNET_LAYERS
from core.editing.structure import APIVectorLayerStructure
from core.editing.utils import LayerLock
from core.api.authentication import CsrfExemptSessionAuthentication
from .models import *
from client.utils.editing import *
from .configs import ITERNET_LAYERS

iternet_connection = copy.copy(settings.DATABASES[settings.ITERNET_DATABASE])


def buidlKeyValue(legModel):
    return [{'key':l.id, 'value':l.description} for l in legModel.objects.all()]

def getLayerIternetIdByName(layerName, object=False):
    layers = Config.getData().project.layer_set.filter(name=layerName)
    if len(layers) == 1:
        if object:
            return layers[0]
        else:
            return layers[0].pk
    else:
        return None

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


class EditingApiView(APIView):
    """
    APIView to get data Project and layers
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


    bbox_filter_field = 'the_geom'
    bbox_filter_include_overlapping = True

    def get(self, request, format=None, layer_name=None):

        if layer_name not in ITERNET_LAYERS.keys():
            raise APIException('Only one of this: {}'.format(', '.join(ITERNET_LAYERS.keys())))

        # check is editing mode ad inputs
        editingMode = 'editing' in request.GET
        configMode = 'config' in request.GET

        if editingMode and configMode:
            raise APIException('config and editing get parameters not allowed')

        # Instance bbox filter
        bboxFilter = InBBoxFilter()

        #   in_bbox=1627296.88291268446482718,4854554.72152963746339083,1628408.71542843640781939,4855197.11364984977990389
        #http://localhost:8000/it/iternet/api/editing/elemento_stradale/?in_bbox=1627296.88291268446482718,4854554.72152963746339083,1628408.71542843640781939,4855197.11364984977990389


        if not configMode:
            featurecollection = {}
            for iternetLayer, dataLayer in ITERNET_LAYERS.items():
                if layer_name == iternetLayer:
                    featuresLayer = bboxFilter.filter_queryset(request, dataLayer['model'].objects.all(), self)
                    featurecollection = dataLayer['geoSerializer'](featuresLayer, many=True).data

        # get layer qdjango
        layer = Config.getData().project.layer_set.get(name=layer_name)

        # lock features
        featuresLocked = []
        if editingMode:
            lock = LayerLock(
                appName='iternet',
                layer=layer,
                user=request.user
            )

            # get feature locked:
            featuresLocked = lock.lockFeatures([str(f.gid) for f in featuresLayer])

        if configMode:
            vectorParams = {
                'geomentryType': ITERNET_LAYERS[layer_name]['geometryType'],
                'fields': mapLayerAttributes(
                    getLayerIternetIdByName(layer_name, object=True),
                    formField=True,
                    fields=forms[layer_name]['fields']
                ),
                'pkField': ITERNET_LAYERS[layer_name]['model']._meta.pk.name
            }

            if layer_name in relationForms:
                vectorParams['relations'] = relationForms[layer_name]
        else:
            vectorParams = {
                'data': featurecollection,
                'geomentryType': ITERNET_LAYERS[layer_name]['geometryType'],
            }

        vectorParams['featureLocks'] = featuresLocked



        # instance new vectolayer
        vectorLayer = APIVectorLayerStructure(**vectorParams)
        return Response(vectorLayer.as_dict())


    def post(self, request, format=None):
        """
        Save data on database, clientsend data for every layer of iternet project.
        """
        data = request.data

        # start transaction
        try:
            with transaction.atomic():
                for layerConfigName, layerConfigData in ITERNET_LAYERS.items():
                    clientVar = layerConfigData['clientVar']
                    if clientVar in data:
                        model = layerConfigData['model']


                        # save insert
                        for mode in ('add', 'update'):
                            if mode in data[clientVar]:
                                for GeoJSONFeature in data[clientVar][mode]:
                                    if mode == 'add':
                                        serializer = layerConfigData['geoSerializer'](data=GeoJSONFeature)
                                    else:
                                        feature = model.objects.get(pk=GeoJSONFeature['id'])
                                        serializer = layerConfigData['geoSerializer'](feature, data=GeoJSONFeature)
                                    if serializer.is_valid():
                                        dato = serializer.save()
                                    else:
                                        raise ValidationError({
                                            'result': False,
                                            'errors': serializer.errors
                                        })

                        # save delete
                        if 'delete' in data[clientVar]:
                            features = model.objects.filter(pk__in=data[clientVar]['delete'])
                            for feature in features:
                                #feature.delete()
                                pass

                # now unlocked feature id
                # get feature locked and erase from lock table
                if 'lockids' in data:
                    LayerLock.unLockFeatures(data['lockids'])

        except IntegrityError as e:
            return Response({
                'result': False,
                'errors': e.message
            })

        return Response({"result": True})


class DashboardView(TemplateView):

    template_name = 'iternet/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super(DashboardView, self).get_context_data(**kwargs)

        # set data iternet connection
        context['db_connection'] = iternet_connection

        # get report data from nodi accessi and elementi stradali
        '''
        context['n_accessi'] = len(Accesso.objects.all())
        context['n_elementi_stradali'] = len(ElementoStradale.objects.all())
        context['n_giunzioni_stradali'] = len(GiunzioneStradale.objects.all())
        '''
        context['n_accessi'] = 'n'
        context['n_elementi_stradali'] = 'n'
        context['n_giunzioni_stradali'] = 'n'
        return context




class ConfigView(FormView):

    form_class = ConfigForm
    template_name = 'iternet/config.html'


    def get_success_url(self):
        return reverse('iternet-dashboard')

    def get_object(self):
        self.object = Config.getData()

    def get_form_kwargs(self):
        """
        Returns the keyword arguments for instantiating the form.
        """
        self.get_object()
        kwargs = super(ConfigView, self).get_form_kwargs()
        kwargs.update({'instance': self.object })
        return kwargs

    def form_valid(self, form):
        self.object = form.save()
        return super(ConfigView, self).form_valid(form)


class DownloadQgisPgConnectionView(View):

    def get(self, request, *args, **kwargs):

        qgisPgConnection = QgisPgConnection(
            host=iternet_connection['HOST'],
            username=iternet_connection['USER'],
            password=iternet_connection['PASSWORD'],
            port=iternet_connection['PORT'],
            name='G3W-ADMIN-ITERNET',
            database=iternet_connection['NAME'],
        )

        # get configuration data
        response = HttpResponse(qgisPgConnection.asXML(), content_type='text/xml')
        response['Content-Disposition'] = 'attachment; filename="g3w_iternet_qgis_connection.xml"'
        return response

