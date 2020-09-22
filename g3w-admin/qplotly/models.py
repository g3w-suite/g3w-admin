from django.db import models
from django.utils.translation import ugettext_lazy as _
from qdjango.models import Layer


class QplotlyWidget(models.Model):
    """
    Layer Qplotly Widget
    """
    xml = models.TextField(_('XML original settings'))
    datasource = models.TextField(_('Layer datasource'))
    selected_features_only = models.BooleanField(_('Use selected features only'), default=False)
    visible_features_only = models.BooleanField(_('Use visible features only'), default=False)
    type = models.CharField(_('Plot type'), max_length=50, null=True)

    layers = models.ManyToManyField(Layer)
    
    def __str__(self):
        return self.datasource


