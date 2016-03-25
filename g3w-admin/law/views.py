from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.core.urlresolvers import reverse_lazy
from core.mixins.views import *
from .models import *
from .forms import LawForm
from .mixins.views import *



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


# ------------------------------------------
# ARTICLES
# ------------------------------------------

class ArticleListView(G3WLawViewMixin, ListView):
    template_name = 'law/article_list.html'
    model = Articles