# coding=utf-8
""""Qdjango searches classes

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-06-28'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from core.searches import G3WAdminSearch
from .models import Project


class ProjectSearch(G3WAdminSearch):

    # Model
    _model = Project

    # Model fields where to search
    _search_fields = ['title', 'title_ur']

    _search_fields_i18n = ['title_ur', 'description']

    # Template result: template to use into template rendering
    _template = 'qdjango/search/project.html'

    _perms = 'qdjango.view_project'

    _qs_filters = {'is_active': True}
