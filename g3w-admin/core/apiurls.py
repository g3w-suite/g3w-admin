from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.views import layer_vector_view


urlpatterns = [
    url(r'^vector/api/(?P<mode_call>data|config)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/'
        r'(?P<layer_name>[-_\w\d]+)/$',
        login_required(layer_vector_view), name='core-vector-api')
]