from django.views.generic import (
    ListView,
)
from .models import Laws


class LawListView(ListView):
    template_name = 'law/law_list.html'
    model = Laws
