from django.contrib import admin
from .models import *


class ConfigsAdmin(admin.ModelAdmin):
    model = Configs
admin.site.register(Configs, ConfigsAdmin)


class LayersAdmin(admin.ModelAdmin):
    model = Layers
admin.site.register(Layers, ConfigsAdmin)
