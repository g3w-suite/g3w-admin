from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    FormView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.http import HttpResponse, Http404
from django.core.urlresolvers import reverse_lazy
from django.db.models import ObjectDoesNotExist, Q
from django.db import transaction
import tablib
from copy import copy
from core.mixins.views import *
from .models import *
from .forms import LawForm, ArticleForm, LawNewVariationForm
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


class LawNewVariationView(AjaxableFormResponseMixin, FormView):

    form_class = LawNewVariationForm
    template_name = 'law/ajax/law_new_variation.html'
    success_url = reverse_lazy('law-list')

    def _get_law_object(self):
        lawSlug = self.kwargs['slug']
        return Laws.objects.get(slug=lawSlug)

    @transaction.atomic
    def form_valid(self, form):
        # get law slug
        newVariation = form.cleaned_data['variation']
        newFromDate = form.cleaned_data['fromdate']
        newToDate = form.cleaned_data['todate']
        parentLaw = self._get_law_object()
        # create ne law row in db
        childLaw = Laws(name=parentLaw.name, description=parentLaw.description, fromdate=newFromDate,
                        todate=newToDate, variation=newVariation)
        childLaw.save()
        # creates a copy of articles
        parentArticles = parentLaw.articles_set.all()
        for article in parentArticles:
            childArticle = copy(article)
            childArticle.id = None
            childArticle.law = childLaw
            childArticle.save()
        return super(LawNewVariationView, self).form_valid(form)


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


class LawArticlesUploadView(G3WLawViewMixin, View):

    def post(self, request, *args, **kwargs):

        file = request.FILES['files[]'] if request.FILES else None

        # try import data
        dataset = tablib.Dataset()
        if file.content_type == 'text/csv':
            dataset.csv = file.read()
        else:
            dataset.xls = file.read()
        dh = dataset.headers
        idsToRest = []
        with transaction.atomic():
            for d in dataset:
                # build data for model and filter
                dataArticle = {
                    'number': str(d[dh.index('number')]),
                    'comma': str(d[dh.index('comma')]),
                    'title': str(d[dh.index('title')]),
                    'content': str(d[dh.index('content')]),
                    'law': self.law
                }
                try:
                    article = Articles.objects.get(**dataArticle)
                except ObjectDoesNotExist:
                    article = Articles(**dataArticle)
                finally:
                    article.content = str(d[dh.index('content')])
                    article.save()
                    idsToRest.append(article.pk)
            # erase old
            articlesToDelete = Articles.objects.filter(~Q(pk__in=idsToRest), law=self.law)
            for article in articlesToDelete:
                article.delete()

        return HttpResponse('Articles list uploaded and updated')


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

