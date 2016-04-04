from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.http import HttpResponse, Http404
from django.core.urlresolvers import reverse_lazy
from core.mixins.views import *
from .models import *
from .forms import LawForm, ArticleForm
from .mixins.views import *
from .ie.resources import ArticlesResource



class LawListView(ListView):
    template_name = 'law/law_list.html'
    model = Laws


class LawAddView(CreateView):
    """
    Create view for law
    """
    form_class = LawForm
    template_name = 'law/law_form.html'
    success_url = reverse_lazy('law-list')

class LawUpdateView(UpdateView):
    model = Laws
    form_class = LawForm
    template_name = 'law/law_form.html'
    success_url = reverse_lazy('law-list')


class LawDetailView(DetailView):
    model = Laws
    template_name = 'law/ajax/law_detail.html'


class LawDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin,View):
    """
    Delete law Ajax view
    """
    model = Laws


class LawArticlesExportView(View):

    def get(self, request, *args, **kwargs):

        dataset = ArticlesResource(lawslug=kwargs['law_slug']).export()
        mode = kwargs.get('mode','xls')
        if mode == 'xls':
            response = HttpResponse(dataset.xls, content_type='application/ms-excel')
            response['Content-Disposition'] = 'attachment; filename=articles.xls'
        elif mode == 'csv':
            response = HttpResponse(dataset.csv, content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename=articles.csv'
        else:
            raise Http404()

        return response


# ------------------------------------------
# ARTICLES
# ------------------------------------------

class ArticleListView(G3WLawViewMixin, ListView):
    template_name = 'law/article_list.html'
    model = Articles

    def get_queryset(self):
        return self.law.articles_set.all().order_by('number')


class ArticleAddView(G3WLawViewMixin,CreateView):
    form_class = ArticleForm
    model = Articles
    template_name = 'law/article_form.html'
    law = None

    def get_success_url(self):
        reverse_lazy('law-article-list', kwargs={'law_slug': self.law.slug})


class ArticleUpdateView(ArticleAddView, UpdateView):
    pass


class ArticleDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    """
    Delete law article Ajax view
    """
    model = Articles


class ArticleDetailView(DetailView):
    model = Articles
    template_name = 'law/ajax/article_detail.html'

