from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [
    url(r'^config/$', login_required(CduConfigList.as_view()), name='cdu-config-list'),
    url(r'config/add/$', login_required(CduConfigWizardView.as_view()), name='cdu-config-add'),
]