from django.contrib import admin
from django.utils.translation import ugettext_lazy as _
from ordered_model.admin import OrderedModelAdmin
from sitetree.admin import TreeItemAdmin, override_item_admin
from .ie.admin import G3WImportExportModelAdmin
from .models import Group, BaseLayer, MapControl
from guardian.admin import GuardedModelAdmin


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


class BaseLayerAdmin(GuardedModelAdmin):
    model = BaseLayer
admin.site.register(BaseLayer, BaseLayerAdmin)


class MapControlAdmin(OrderedModelAdmin, G3WImportExportModelAdmin):
    model = MapControl
    list_display = ('name', 'move_up_down_links')
admin.site.register(MapControl, MapControlAdmin)

# Tweak admin site settings like title, header, 'View Site' URL, etc
admin.site.site_title = 'G3W Admin Administration'
admin.site.site_header = 'G3W Admin Administration'