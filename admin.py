from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import *


class ConfigsAdmin(GuardedModelAdmin):
    model = Configs
admin.site.register(Configs, ConfigsAdmin)


class LayersAdmin(admin.ModelAdmin):
    model = Layers
admin.site.register(Layers, ConfigsAdmin)
