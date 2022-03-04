from django.urls import path
from .api.views import *
from .views import ClientView

urlpatterns = [

    #Main init client API rest initialization
    path('api/initconfig/<slug:group_slug>/<project_type>/<int:project_id>',
        GroupConfigApiView.as_view(), name='group-map-config'),
    path('api/config/<slug:group_slug>/<project_type>/<int:project_id>',
        ClientConfigApiView.as_view(), name='group-project-map-config'),
]
