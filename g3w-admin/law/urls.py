from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [

    # LAW
    url(r'^list/$', login_required(LawListView.as_view()), name='law-list'),
    url(r'^add/$', login_required(LawAddView.as_view()), name='law-add'),
    url(r'^update/(?P<slug>[-_\w\d]+)/$', login_required(LawUpdateView.as_view()), name='law-update'),
    url(r'^delete/(?P<slug>[-_\w\d]+)/$', login_required(LawDeleteView.as_view()), name='law-delete'),
    url(r'^(?P<slug>[-_\w\d]+)/$', login_required(LawDetailView.as_view()), name='law-detail'),
    url(r'^jx/add/newvariation/(?P<slug>[-_\w\d]+)/$', login_required(LawNewVariationView.as_view()), name='law-add-new-variation'),

    # ARTICLE
    url(r'^(?P<law_slug>[-_\w\d]+)/article/$', login_required(ArticleListView.as_view()), name='law-article-list'),
    url(r'^(?P<law_slug>[-_\w\d]+)/article/add$', login_required(ArticleAddView.as_view()), name='law-article-add'),
    url(r'^(?P<law_slug>[-_\w\d]+)/article/update/(?P<slug>[-_\w\d]+)/$', login_required(ArticleUpdateView.as_view()), name='law-article-update'),
    url(r'^(?P<law_slug>[-_\w\d]+)/article/delete/(?P<slug>[-_\w\d]+)/$', login_required(ArticleDeleteView.as_view()), name='law-article-delete'),
    url(r'^(?P<law_slug>[-_\w\d]+)/article/(?P<slug>[-_\w\d]+)/$', login_required(ArticleDetailView.as_view()), name='law-article-detail'),

    # ARTICLE EXPORT
    url(r'(?P<law_slug>[-_\w\d]+)/article/export/$', login_required(LawArticlesExportView.as_view()), name='law-article-export'),
    url(r'(?P<law_slug>[-_\w\d]+)/article/export/(?P<mode>[-_\w\d]+)$', login_required(LawArticlesExportView.as_view()),
        name='law-article-export-mode'),
]
