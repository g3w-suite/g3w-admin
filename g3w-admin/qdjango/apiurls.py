from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import QdjangoProjectRelationsApiView

urlpatterns = [
    url(r'^api/(?P<group_slug>[-_\w\d]+)/(?P<slug>[-_\w\d]+)/(?P<relation_name>[-_\w\d]+)/(?P<relation_id>[-_\w\d]+)$',
        login_required(QdjangoProjectRelationsApiView.as_view()),
        name='qdjango-api-project-relations'),

]
