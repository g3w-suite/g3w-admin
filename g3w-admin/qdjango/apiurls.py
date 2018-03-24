from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import QdjangoProjectRelationsApiView

urlpatterns = [
    url(r'^api/relations/(?P<project_id>[0-9]+)/(?P<relation_id>[-_\w\d]+)/(?P<relation_field_value>[-+_\w\d]+)$',
        QdjangoProjectRelationsApiView.as_view(),
        name='qdjango-api-project-relations'),


]
