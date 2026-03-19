from django.contrib import admin
from .models import (
    QplotlyWidget, 
    QplotlyWidgetRelation
)

@admin.register(QplotlyWidget)
class QplotlyWidgetAdmin(admin.ModelAdmin):

    list_display = (
        'title',
        'datasource',
        'selected_features_only',
        'visible_features_only',
        'order'
    )


@admin.register(QplotlyWidgetRelation)
class QplotlyWidgetRelationAdmin(admin.ModelAdmin):

    list_display = (
        'source',
        'target',
        'project',
        'order',
    )
    list_filter = (
        'project',
    )
    search_fields = (
        'source__title',
        'target__title',
    )