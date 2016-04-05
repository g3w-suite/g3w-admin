from django.views.generic import TemplateView, FormView, View
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.conf import settings
import copy
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ElementoStradale, Config, Accesso, ElementoStradale, GiunzioneStradale
from .forms import ConfigForm
from .api.serializers import ElementoStradaleGeoSerializer
from qdjango.utils.data import QgisPgConnection

from rest_framework_gis.filters import InBBoxFilter

iternet_connection = copy.copy(settings.DATABASES[settings.ITERNET_DATABASE])

class EditingApiView(APIView):
    """
    APIView to get data Project and layers
    """

    bbox_filter_field = 'the_geom'

    def get(self, request, format=None, layer_name=None):

        if layer_name not in ['giunzione_stradale', 'elemento_stradale', 'accesso']:
            raise Exception('Only one of this: guinzione_stradale, elemento_stradale, accesso')

        bbox = request.GET.get('bbox', None)

        # Instance bbox filter
        bboxFilter = InBBoxFilter()

        #   in_bbox=1627296.88291268446482718,4854554.72152963746339083,1628408.71542843640781939,4855197.11364984977990389

        features = []

        if layer_name == 'elemento_stradale':
            layer = bboxFilter.filter_queryset(request, ElementoStradale.objects.all(), self)
            for feature in layer:
                layerSerializer = ElementoStradaleGeoSerializer(feature)
                features.append(layerSerializer.data)

        if layer_name == 'giunzione_stradale':
            layer = bboxFilter.filter_queryset(request, ElementoStradale.objects.all(), self)
            for feature in layer:
                layerSerializer = ElementoStradaleGeoSerializer(feature)
                features.append(layerSerializer.data)


        return Response({'features':features})


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

