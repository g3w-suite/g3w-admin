from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from qdjango.models import Layer, Project
from .utils.qplotly_settings import QplotlySettings


class QplotlyWidget(models.Model):
    """
    Layer Qplotly Widget
    """
    xml = models.TextField(_('XML original settings'))
    datasource = models.TextField(_('Layer datasource'), null=True)
    selected_features_only = models.BooleanField(_('Use selected features only'), default=False)
    visible_features_only = models.BooleanField(_('Use visible features only'), default=False)
    type = models.CharField(_('Plot type'), max_length=50, null=True)
    title = models.CharField(_('Plot title'), max_length=255, null=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    show_on_start_client = models.BooleanField(_('Set as default plot on starting map'), null=True, default=False)

    layers = models.ManyToManyField(Layer)

    order = models.PositiveIntegerField(
        _('Order'),
        default=0,
        blank=True,
        null=True,
    )

    show_position = models.CharField(
        _('SChart show position'),
        max_length=100,
        blank=True,
        null=True,
        default='sidebarquery'
    )
    
    def __str__(self):
        return self.datasource if self.datasource else str(self.pk)

    def clean(self):
        """Check by DataPlotly API"""

        # check if is a good xml DataPlotly settings
        settings = QplotlySettings()

        if not settings.read_from_model(self):
            raise ValidationError(_('XML is not a DataPlotly settings.'))

        # check for souce_layerd_id inside project and datasource into values
        try:
            layer = Layer.objects.filter(qgs_layer_id=settings.source_layer_id)[0]
        except IndexError:
            raise ValidationError(_(f'Layer with qgs_layer_id={settings.source_layer_id} is not present into DB'))

        # compare datasources
        if self.datasource and layer.datasource != self.datasource:
            raise ValidationError(_(f'Layer DataPlotly settings layer datasource is not equal to datasource into values.'))



