from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin, GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import User, Group
from guardian.admin import GuardedModelAdmin
from django.forms.models import ModelForm
from usersmanage.models import Userdata, Department, Userbackend


class DepartmentAdmin(admin.ModelAdmin):
    model = Department


# Define an inline admin descriptor for Employee model
# which acts a bit like a singleton
class UserdataInLine(admin.StackedInline):
    model = Userdata
    can_delete = False
    verbose_name_plural = 'userdata'

class AlwaysChangedModelForm(ModelForm):
    def has_changed(self):
        """ Should returns True if data differs from initial.
        By always returning true even unchanged inlines will get validated and saved."""
        return True


class UserbackendInLine(admin.StackedInline):
    model = Userbackend
    form = AlwaysChangedModelForm
    can_delete = False
    verbose_name_plural = 'userbackend'


# Define a new User admin
class UserAdmin(GuardedModelAdmin, BaseUserAdmin):
    inlines = (UserdataInLine, UserbackendInLine)


class GroupAdmin(GuardedModelAdmin, BaseGroupAdmin):
    pass

# Re-register UserAdmin and GroupAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(Department, DepartmentAdmin)
admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)
