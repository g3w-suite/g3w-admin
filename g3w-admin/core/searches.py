# coding=utf-8
""""Searches classes for full-text search inside g3w-admin section.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-06-28'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.conf import settings
from django.template import loader
from django.contrib.postgres.search import SearchQuery, SearchVector
from guardian.shortcuts import get_objects_for_user
from .models import Group, MacroGroup


class G3WAdminSearch(object):
    """Base class for full-text search inside g3w-admin modules"""

    # Model
    _model = None

    # Model fields where to search
    _search_fields = []

    # Model_fields under translation
    _search_fields_i18n = []

    # Template result: template to use into template rendering
    _template = None

    # Perms with user setting
    _perms = None

    # QuerySet fitlers
    _qs_filters = None

    def __init__(self, search_text=None, user=None):

        # update search fields with_language
        buffer = []
        for l in settings.LANGUAGES:
            if l[0] != settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
                for f in self._search_fields_i18n:
                    buffer.append(f"{f}_{l[0]}")
        self._search_fields_i18n = buffer

        self.search_text = search_text
        self.user = user
        self.search()

    @property
    def results(self):
        """Get results"""
        return self._results

    @property
    def n_tot_results(self):
        """Return number of results"""
        return len(self._results)

    def render(self):
        """Render html row by self._template"""

        results = loader.get_template(self._template)
        return results.render(context={
            'results': self._results,
            'MEDIA_URL': settings.MEDIA_URL,
            'user': self.user
        })

    def search(self, search_text=None):
        """Main execute search engine"""

        st = search_text if search_text else self.search_text

        if st:
            fields = self._search_fields + self._search_fields_i18n
            #print(fields)
            self._results = self._model.objects. \
                annotate(search=SearchVector(*fields)). \
                filter(search=SearchQuery(st, search_type='phrase'))

            if self.user and self._perms:
                self._results = get_objects_for_user(self.user, self._perms, self._results)

            if self._qs_filters:
                self._results = self.results.filter(**self._qs_filters)


class GroupSearch(G3WAdminSearch):
    """Group search class for map group model"""

    # Model
    _model = Group

    # Model fields where to search
    _search_fields = ['name', 'title', 'description']

    # Model_fields under translation
    _search_fields_i18n = ['title', 'description']

    # Template result: template to use into template rendering
    _template = 'core/search/group.html'

    _perms = 'core.view_group'

    _qs_filters = {'is_active': True}


class MacroGroupSearch(G3WAdminSearch):
    """Group search class for map macro group model"""

    # Model
    _model = MacroGroup

    # Model fields where to search
    _search_fields = ['name', 'title', 'description']

    # Model_fields under translation
    _search_fields_i18n = ['title', 'description']

    # Template result: template to use into template rendering
    _template = 'core/search/macrogroup.html'

    _perms = 'core.view_macrogroup'
