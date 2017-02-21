from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import CduCalculateApiView


urlpatterns = [
    url(r'^api/calculate/(?P<slug>[-_\w\d]+)/$', login_required(CduCalculateApiView.as_view()),
        name="cdu-api-calculate-slug"),
    url(r'^api/calculate/(?P<id>[0-9]+)/$', login_required(CduCalculateApiView.as_view()),
        name="cdu-api-calculate-id"),

]
