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

iternet_connection = copy.copy(settings.DATABASES[settings.ITERNET_DATABASE])

class ElementoStradaleApiView(APIView):
    """
    APIView to get data Project and layers
    """

    def get(self, request, format=None, layer_name=None):

        archi = ElementoStradale.objects.all()
        archiSerializer = ElementoStradaleGeoSerializer(archi[0])

        return Response(archiSerializer.data)


class DashboardView(TemplateView):

    template_name = 'iternet/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super(DashboardView, self).get_context_data(**kwargs)

        # set data iternet connection
        context['db_connection'] = iternet_connection

        # get report data from nodi accessi and elementi stradali
        context['n_accessi'] = len(Accesso.objects.all())
        context['n_elementi_stradali'] = len(ElementoStradale.objects.all())
        context['n_giunzioni_stradali'] = len(GiunzioneStradale.objects.all())

        return context


class ConfigView(FormView):

    form_class = ConfigForm
    template_name = 'iternet/config.html'


    def get_success_url(self):
        return reverse('iternet-dashboard')

    def get_object(self):
        self.object = Config.objects.get()

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