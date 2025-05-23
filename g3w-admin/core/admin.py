from django.conf import settings
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.contrib.admin import ModelAdmin
from django.utils.html import format_html
from ordered_model.admin import OrderedModelAdmin
from sitetree.admin import TreeItemAdmin, override_item_admin
from .ie.admin import G3WImportExportModelAdmin
from .models import (
    Group,
    BaseLayer,
    MapControl,
    MacroGroup,
    G3WSpatialRefSys,
    ProjectMapUrlAlias,
    StatusLog,
    ShortURL,
    PermaLinkURL
)
from guardian.admin import GuardedModelAdmin

import logging

# And our custom tree item admin model.
class G3WTreeItemAdmin(TreeItemAdmin):
    # That will turn a tree item representation from the default variant
    # with collapsible groupings into a flat one.
    fieldsets = (
        (_('Basic settings'), {
            'fields': ('parent', 'title', 'url','type_header','icon_css_class')
        }),
        (_('Access settings'), {
            'classes': ('collapse',),
            'fields': ('access_loggedin', 'access_guest', 'access_restricted', 'access_permissions', 'access_perm_type')
        }),
        (_('Display settings'), {
            'classes': ('collapse',),
            'fields': ('hidden', 'inmenu', 'inbreadcrumbs', 'insitetree')
        }),
        (_('Additional settings'), {
            'classes': ('collapse',),
            'fields': ('hint', 'description', 'alias', 'urlaspattern')
        }),
    )

# Now we tell the SiteTree to replace generic representations with custom.
override_item_admin(G3WTreeItemAdmin)


class GroupAdmin(GuardedModelAdmin):
    model = Group
admin.site.register(Group, GroupAdmin)


class MacroGroupAdmin(GuardedModelAdmin, OrderedModelAdmin):
    model = MacroGroup
admin.site.register(MacroGroup, MacroGroupAdmin)


class BaseLayerAdmin(GuardedModelAdmin, OrderedModelAdmin):
    model = BaseLayer
    list_display = ('name', 'move_up_down_links')
admin.site.register(BaseLayer, BaseLayerAdmin)


class MapControlAdmin(OrderedModelAdmin, G3WImportExportModelAdmin):
    model = MapControl
    list_display = ('name', 'move_up_down_links')
admin.site.register(MapControl, MapControlAdmin)


class G3WSpatialRefSysAdmin(ModelAdmin):
    model = G3WSpatialRefSys
admin.site.register(G3WSpatialRefSys, G3WSpatialRefSysAdmin)


class ProjectMapUrlAliasAdmin(ModelAdmin):
    model = ProjectMapUrlAlias
    list_display = ('app_name', 'project_id', 'alias')
admin.site.register(ProjectMapUrlAlias, ProjectMapUrlAliasAdmin)

class StatusLogAdmin(admin.ModelAdmin):
    list_display = ('logger_name','colored_msg', 'traceback', 'create_datetime_format')
    list_display_links = ('colored_msg', )
    list_filter = ('level', )
    list_per_page = settings.DB_LOGGER_ADMIN_LIST_PER_PAGE

    def colored_msg(self, instance):
        if instance.level in [logging.NOTSET, logging.INFO]:
            color = 'green'
        elif instance.level in [logging.WARNING, logging.DEBUG]:
            color = 'orange'
        else:
            color = 'red'
        return format_html('<span style="color: {color};">{msg}</span>', color=color, msg=instance.msg)
    colored_msg.short_description = 'Message'

    def traceback(self, instance):
        return format_html('<pre><code>{content}</code></pre>', content=instance.trace if instance.trace else '')

    def create_datetime_format(self, instance):
        return instance.create_datetime.strftime('%Y-%m-%d %X')
    create_datetime_format.short_description = 'Created at'

admin.site.register(StatusLog, StatusLogAdmin)

class ShortURLAdmin(admin.ModelAdmin):
    model = ShortURL
admin.site.register(ShortURL, ShortURLAdmin)

class PermaLinkURLAdmin(admin.ModelAdmin):
    model = PermaLinkURL
    list_display = ('permalink_code', 'created', 'modified')
admin.site.register(PermaLinkURL, PermaLinkURLAdmin)

# Tweak admin site settings like title, header, 'View Site' URL, etc
admin.site.site_title = 'G3W Admin Administration'
admin.site.site_header = 'G3W Admin Administration'