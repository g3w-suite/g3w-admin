from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [
    # LAW
    url(r'^list/$', login_required(LawListView.as_view()), name='law-list')
]

'''
 url(r'law/add/$', login_required(LawAddView.as_view()), name='law-add'),
 url(r'law/(?P<slug>[-_\w\d]+)/detail/$', login_required(LawDetailView.as_view()), name='law-detail'),
 url(r'law/(?P<slug>[-_\w\d]+)/update/$', login_required(LawUpdateView.as_view()), name='law-update'),
 url(r'law/(?P<slug>[-_\w\d]+)/delete/$', login_required(LawDeleteView.as_view()), name='law-delete'),
 url(r'law/(?P<slug>[-_\w\d]+)/newvariation/$', login_required(LawNewVariationView.as_view()),
     name='law-new-variation'),
 # ARTICLE
 url(r'law/(?P<slug>[-_\w\d]+)/add-article/$', login_required(ArticleAddView.as_view()), name='law-article-add'),
 url(r'law/article/(?P<slug>[-_\w\d]+)/detail/$', login_required(ArticleDetailView.as_view()),
     name='law-article-detail'),
 url(r'law/article/(?P<slug>[-_\w\d]+)/update/$', login_required(ArticleUpdateView.as_view()),
     name='law-article-update'),
 url(r'law/article/(?P<slug>[-_\w\d]+)/delete/$', login_required(ArticleDeleteView.as_view()),
     name='law-article-delete'),
 '''