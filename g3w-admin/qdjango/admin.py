from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import *


class ProjectAdmin(GuardedModelAdmin):
    model = Project
admin.site.register(Project, ProjectAdmin)


class LayerAdmin(GuardedModelAdmin):
    model = Layer
admin.site.register(Layer, LayerAdmin)