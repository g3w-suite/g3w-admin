# coding=utf-8
"""
   Model translation for care modules.
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-01-31'
__copyright__ = 'Copyright 2020, GIS3W'


from modeltranslation.translator import register, TranslationOptions
from .models import GeneralSuiteData


@register(GeneralSuiteData)
class NewsTranslationOptions(TranslationOptions):
    fields = (
        'title',
        'sub_title',
        'home_description',
        'about_title',
        'about_description',
        'about_name',
        'groups_title',
        'groups_map_description',
        'login_description',
        'credits',
        'main_map_title',
    )