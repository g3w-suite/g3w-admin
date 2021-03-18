from django.db import models

# Create your models here.
from qgis.PyQt.QtCore import QVariant


# List of required fields for an ORS compatible layer
ORS_REQUIRED_LAYER_FIELDS = {
    'value': QVariant.Int,
    'group_index': QVariant.Int,
    'area': QVariant.Double,
    'reachfactor': QVariant.Double,
    'total_pop': QVariant.Int
}
