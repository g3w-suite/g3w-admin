from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import *


class ProjectAdmin(GuardedModelAdmin):
    model = Project
    search_fields = (
        'title',
    )
    list_display = (
        'title',
        'group'
    )


admin.site.register(Project, ProjectAdmin)


class LayerAdmin(GuardedModelAdmin):
    model = Layer
    search_fields = (
        'name',
        'title',
        'qgs_layer_id',
        'layer_type'
    )
    list_display = (
        'name',
        'title',
        'project'
    )


admin.site.register(Layer, LayerAdmin)


class WidgetAdmin(GuardedModelAdmin):
    model = Widget


admin.site.register(Widget, WidgetAdmin)


class SingleLayerSessionFilterAdmin(admin.ModelAdmin):
    model = SingleLayerSessionFilter
    list_display = (
        'time_asked',
        'sessionid',
        'token',
        'qgs_expr',
        'user'
    )


admin.site.register(SingleLayerSessionFilter, SingleLayerSessionFilterAdmin)