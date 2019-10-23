from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import *


class ProjectAdmin(GuardedModelAdmin):
    model = Project
admin.site.register(Project, ProjectAdmin)


class LayerAdmin(GuardedModelAdmin):
    model = Layer
    search_fields = (
        'name',
        'title',
        'qgs_layer_id',
        'layer_type'
    )
admin.site.register(Layer, LayerAdmin)


class WidgetAdmin(GuardedModelAdmin):
    model = Widget
admin.site.register(Widget, WidgetAdmin)