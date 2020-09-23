# coding=utf-8
"""" Qplotly main views module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-22'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.views.generic import ListView
from django.utils.decorators import method_decorator
from qdjango.models import Project
from qdjango.mixins.views import QdjangoProjectViewMixin, QdjangoLayerViewMixin
from guardian.decorators import permission_required

from core.mixins.views import AjaxableFormResponseMixin, G3WProjectViewMixin

from .models import QplotlyWidget
from .utils.models import get_qplotlywidgets4layer


class LayerQplotlyWidgetsView(QdjangoProjectViewMixin, QdjangoLayerViewMixin, ListView):
    """
    Render qplotly layer's widgets list.
    """
    model = QplotlyWidget
    template_name = 'qplotly/ajax/layer_widgets.html'

    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_queryset(self):
        return get_qplotlywidgets4layer(self.layer)


