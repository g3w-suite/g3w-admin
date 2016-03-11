from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [
    url(r'^(?P<group_slug>[-_\w\d]+)/projects/$', login_required(QdjangoProjectListView.as_view()), name='qdjango-project-list'),
    url(r'^(?P<group_slug>[-_\w\d]+)/project/add/$', login_required(OdjangoProjectCreateView.as_view()), name='qdjango-project-add'),
]


from sitetree.sitetreeapp import register_dynamic_trees, compose_dynamic_tree

#get qdjango sitetree and add items to core sitetree:
register_dynamic_trees(
    compose_dynamic_tree('qdjango', target_tree_alias='core', parent_tree_item_alias='project-list'),
    reset_cache=True
)
