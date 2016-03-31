from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [
    url(r'^api/editing/(?P<layer_name>[-_\w\d]+)/$', login_required(ElementoStradaleApiView.as_view()), name='iternet-api-editing'),
]
