import ast

from django.contrib import admin, messages
from django.forms import CharField, ModelForm, TextInput
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.translation import gettext
from django.utils.translation import gettext_lazy as _
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


admin.site.register(Project, ProjectAdmin)


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


admin.site.register(Layer, LayerAdmin)


class QgisAuthAdminForm(ModelForm):

    username = CharField()
    password = CharField()

    def __init__(self, *args, **kwargs):
        kwargs['initial'] = kwargs.get('initial', {})
        if kwargs.get('instance'):
            config = ast.literal_eval(kwargs['instance'].config)
            kwargs['initial']['password'] = config['password']
            kwargs['initial']['username'] = config['username']

        super(QgisAuthAdminForm, self).__init__(*args, **kwargs)

        if kwargs.get('instance'):
            if kwargs['instance'] and kwargs['instance'].pk:
                self.fields['id'].disabled = True

    class Meta:
        model = QgisAuth
        fields = ['id', 'name', 'username', 'password']

    def clean(self):
        super().clean()
        cleaned_data = cleaned_data = super().clean()
        cleaned_data['config'] = "{{'username': '{username}', 'password': '{password}', 'realm': ''}}".format(
            username=cleaned_data['username'].replace("'", "\'"), password=cleaned_data['password'].replace("'", "\'"))
        self.instance.config = cleaned_data['config']
        return cleaned_data


class QgisAuthAdmin(GuardedModelAdmin):
    model = QgisAuth
    form = QgisAuthAdminForm

    list_display = (
        'id',
        'name',
        'method',
    )

    def delete_view(self, request, object_id, extra_context=None):
        try:
            return super().delete_view(request, object_id, extra_context=None)
        except LayerDependenciesError as ex:
            msg = _("{} can not be deleted because: {}").format(
                self.model.objects.get(id=object_id).name, ex)
            self.message_user(request, msg, messages.ERROR)
            opts = self.model._meta
            return_url = reverse(
                'admin:{}_{}_change'.format(opts.app_label, opts.model_name),
                args=(object_id,),
                current_app=self.admin_site.name,
            )
            return HttpResponseRedirect(return_url)

    def response_action(self, request, queryset):
        try:
            return super().response_action(request, queryset)
        except LayerDependenciesError as ex:
            msg = _("This object can not be deleted because: %s.") % ex
            self.message_user(request, msg, messages.ERROR)
            opts = self.model._meta
            return_url = reverse(
                'admin:{}_{}_change'.format(opts.app_label, opts.model_name),
                current_app=self.admin_site.name,
            )
            return HttpResponseRedirect(return_url)

    def has_delete_permission(self, request, obj=None):
        if obj is not None and Layer.objects.filter(
                datasource__contains=obj.id).count() > 0:
            msg = _("Authentication configuration {} can not be deleted because one or more layers are using it: {}").format(obj.id,
                ', '.join([l.name for l in Layer.objects.filter(datasource__contains=obj.id)]))
            self.message_user(request, msg, messages.WARNING)
        return super(QgisAuthAdmin, self).has_delete_permission(request, obj) and (
            not obj or Layer.objects.filter(
                datasource__contains=obj.id).count() == 0
        )


admin.site.register(QgisAuth, QgisAuthAdmin)
