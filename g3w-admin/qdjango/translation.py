# coding=utf-8
"""
   Model translation for qdjango modules.
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-01-31'
__copyright__ = 'Copyright 2020, GIS3W'


from modeltranslation.translator import register, TranslationOptions
from .models import Project, Message


@register(Project)
class GeneralSuiteDataTranslationOptions(TranslationOptions):
    """ Qdjango Project model translation """
    fields = (
        'title_ur',
        'description',
    )

@register(Message)
class GeneralSuiteDataTranslationOptions(TranslationOptions):
    """ Qdjango Message model translation """
    fields = (
        'title',
        'body',
    )

