# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.contrib import admin

# Register your models here.

from .models import *


class ConstraintAdmin(admin.ModelAdmin):
    model = Constraint


class ConstraintRuleAdmin(admin.ModelAdmin):
    model = ConstraintRule

admin.site.register(Constraint, ConstraintAdmin)
admin.site.register(ConstraintRule, ConstraintRuleAdmin)