from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import *


@admin.register(Project)
class ProjectAdmin(GuardedModelAdmin):
    search_fields = (
        'title',
    )
    list_display = (
        'title',
        'group'
    )


@admin.register(Layer)
class LayerAdmin(GuardedModelAdmin):
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


@admin.register(Widget)
class WidgetAdmin(GuardedModelAdmin):
    pass


class SessionTokenFilterLayerAdminInline(admin.TabularInline):
    model = SessionTokenFilterLayer


@admin.register(SessionTokenFilter)
class SessionTokenFilterAdmin(admin.ModelAdmin):
    list_display = (
        'time_asked',
        'sessionid',
        'token',
        'user'
    )
    inlines = [
        SessionTokenFilterLayerAdminInline
    ]






