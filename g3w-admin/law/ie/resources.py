from import_export import resources
from law.models import *


class ArticlesResource(resources.ModelResource):

    class Meta:
        model = Articles
        exclude = ['id','slug','law']

    def __init__(self,*args,**kwargs):
        if 'lawslug' in kwargs:
            self.lawSlug = kwargs['lawslug']

    def get_queryset(self):
        if hasattr(self,'lawSlug'):
            law = Laws.objects.get(slug=self.lawSlug)
            return self._meta.model.objects.filter(law=law)
        else:
            return self._meta.model.objects.all()