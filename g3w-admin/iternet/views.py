from django.views.generic import TemplateView, FormView, View
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.conf import settings
import copy
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ElementoStradale, Config, Accesso, ElementoStradale, GiunzioneStradale
from .forms import ConfigForm
from qdjango.utils.data import QgisPgConnection
from rest_framework_gis.filters import InBBoxFilter
from .configs import ITERNET_LAYERS
from core.editing.structure import APIVectorLayerStructure
from core.editing.utils import LayerLock
from .models import *
from client.utils.editing import editingFormField

iternet_connection = copy.copy(settings.DATABASES[settings.ITERNET_DATABASE])


def buidlKeyValue(legModel):
    return [{'key':l.id, 'value':l.description} for l in legModel.objects.all()]

forms = {
    'giunzione_stradale': {
        'fields': [
            editingFormField('tip_gnz', inputType='select', values=buidlKeyValue(LegTipGnz)),
            editingFormField('org', inputType='select', values=buidlKeyValue(LegOrg))
        ]
    },
    'elemento_stradale': {
        'fields': [
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
        ]
    },
    'accesso': {
        'fields': [
            editingFormField('tip_acc', inputType='select', values=buidlKeyValue(LegTipAcc))
        ]
    }
}

class EditingApiView(APIView):
    """
    APIView to get data Project and layers
    """

    bbox_filter_field = 'the_geom'
    bbox_filter_include_overlapping = True

    def get(self, request, format=None, layer_name=None):

        if layer_name not in ITERNET_LAYERS.keys():
            raise Exception('Only one of this: {}'.format(', '.join(ITERNET_LAYERS.keys())))

        # check is editing mode ad inputs
        editingMode = 'editing' in request.GET
        configMode = 'config' in request.GET

        if editingMode and configMode:
            raise Exception('config and editing get parameters not allowed')

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
                'inputs': forms[layer_name]['fields'],
                'pkField': ITERNET_LAYERS[layer_name]['model']._meta.pk.name
            }
        else:
            vectorParams = {
                'data': featurecollection,
                'geomentryType': ITERNET_LAYERS[layer_name]['geometryType'],
            }

        vectorParams['featureLocks'] = featuresLocked

        # instance new vectolayer
        vectorLayer = APIVectorLayerStructure(**vectorParams)
        return Response(vectorLayer.as_dict())


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

