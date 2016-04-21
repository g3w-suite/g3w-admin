from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from iternet.views import *

BASE_INTERNET_API_EDITING = 'api/editing/'

urlpatterns = [
    url(r'^{}$'.format(BASE_INTERNET_API_EDITING), login_required(EditingApiView.as_view()), name='iternet-api-editing'),
    url(r'^{}(?P<layer_name>[-_\w\d]+)/$'.format(BASE_INTERNET_API_EDITING), login_required(EditingApiView.as_view()), name='iternet-api-editing'),
    url(r'^api/numero_civico/$', login_required(NumeroCivicoApiView.as_view()), name="iternet-api-civici"),
    url(r'^api/toponimo_stradale/$', login_required(ToponimoStradaleApiView.as_view()), name="iternet-api-toponimi")
]
