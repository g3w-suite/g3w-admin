from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from usersmanage.models import UserData, Department


class DepartmentAdmin(admin.ModelAdmin):
    model = Department

# Define an inline admin descriptor for Employee model
# which acts a bit like a singleton
class UserDataInLine(admin.StackedInline):
    model = UserData
    can_delete = False
    verbose_name_plural = 'userdata'

# Define a new User admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserDataInLine, )

# Re-register UserAdmin
#admin.site.register(DepartmentAdmin)
admin.site.unregister(User)
admin.site.register(User, UserAdmin)