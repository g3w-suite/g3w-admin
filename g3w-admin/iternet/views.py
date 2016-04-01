from django.views.generic import TemplateView, FormView
from django.core.urlresolvers import reverse
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ElementoStradale, Config
from .forms import ConfigForm
from .api.serializers import ElementoStradaleGeoSerializer

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


