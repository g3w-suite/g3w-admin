# coding=utf-8
""""API filter for single layer constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-21'
__copyright__ = 'Copyright 2020, ItOpen'

from core.api.filters import BaseFilterBackend
from qdjango.models.constraints import ConstraintRule

class SingleLayerConstraintFilter(BaseFilterBackend):
    """A filter backend that applies a subset string"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.original_subset_string = ''

    def apply_filter(self, request, qgis_layer, qgis_feature_request, view=None):
        """Apply the filter to the QGIS feature request or the layer's subset string
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.
        """

        subset_string = ConstraintRule.get_subsetstring_for_user(request.user, qgis_layer.id())
        if not subset_string:
            return

        self.original_subset_string = qgis_layer.subsetString()
        if self.original_subset_string:
            qgis_layer.setSubsetString("({original_subset_string}) AND ({extra_subset_string})".format(original_subset_string=self.original_subset_string, extra_subset_string=subset_string))
        else:
            qgis_layer.setSubsetString(subset_string)

