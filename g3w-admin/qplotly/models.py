from django.db import models
from qdjango.models import Project


class Settings(models.Model):
    """Store aplotly settings data for qgis project"""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='qplotly_setting')
    qgs_layer_id = models.CharField('QGIS project layer id', max_length=400)
    selected_features_only = models.BooleanField('Use selected features only', default=False)
    visible_features_only = models.BooleanField('Use visible features only', default=False)
    xml = models.TextField('XML original settings')


