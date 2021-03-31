from django.contrib import admin
from .models import *


class G3WEditingLayerAdmin(admin.ModelAdmin):
    model = G3WEditingLayer
    list_display = (
        'id',
        'app_name',
        'layer_id'
    )


admin.site.register(G3WEditingLayer, G3WEditingLayerAdmin)


class G3WEditingFeatureLockAdmin(admin.ModelAdmin):
    model = G3WEditingFeatureLock
    list_display = (
        'id',
        'app_name',
        'layer_name',
        'layer_datasource',
        'user',
        'sessionid',
        'feature_lock_id',
        'time_locked'
    )


admin.site.register(G3WEditingFeatureLock, G3WEditingFeatureLockAdmin)


class G3WEditingLogAdmin(admin.ModelAdmin):
    model = G3WEditingLog
    list_display = (
        'id',
        'app_name',
        'layer_id',
        'user',
        'created',
        'mode'
    )


admin.site.register(G3WEditingLog, G3WEditingLogAdmin)