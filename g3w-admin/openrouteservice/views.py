# coding=utf-8
""""Views for operouteservice G3W-Suite plugin

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'

# See api.views for services

from core.mixins.views import G3WRequestViewMixin
from django.urls import reverse_lazy
from django.views.generic import ListView
from django.views.generic.edit import (CreateView, DeleteView, FormView,
                                       UpdateView)
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required_or_403

from .forms import OpenrouteserviceProjectForm
from .models import OpenrouteserviceProject


class OpenrouteServiceProjectFormBase(G3WRequestViewMixin):

    form_class = OpenrouteserviceProjectForm
    success_url = reverse_lazy('ors-project-list')
    model = OpenrouteserviceProject

    @method_decorator(permission_required_or_403('qdjango.change_project'))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


class OpenrouteserviceProjectList(G3WRequestViewMixin, ListView):
    model = OpenrouteserviceProject


class OpenrouteserviceProjectCreate(OpenrouteServiceProjectFormBase, CreateView):
    template_name = 'openrouteservice/openrouteserviceproject_form.html'


class OpenrouteserviceProjectUpdate(OpenrouteServiceProjectFormBase, UpdateView):
    template_name = 'openrouteservice/openrouteserviceproject_form.html'


class OpenrouteserviceProjectDelete(OpenrouteServiceProjectFormBase, DeleteView):
    model = OpenrouteserviceProject
