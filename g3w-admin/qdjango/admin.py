import ast

from django.contrib import admin, messages as django_messages
from django.forms import CharField, ModelForm, TextInput, MultipleChoiceField, ChoiceField
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.translation import gettext
from django.utils.translation import gettext_lazy as _
from ordered_model.admin import OrderedModelAdmin
from guardian.admin import GuardedModelAdmin
from .models import *


@admin.register(Project)
class ProjectAdmin(GuardedModelAdmin):
    search_fields = (
        'title',
    )
    list_display = (
        'title',
        'is_active',
        'group'
    )


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


class ColumnAclAdminForm(ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['restricted_fields'] = MultipleChoiceField(
            choices=self.fields_choices)
        self.fields['layer'].queryset = Layer.vectors.all()

    def fields_choices(self):

        try:
            return [(n, n) for n in self.instance.layer.qgis_layer.fields().names()]
        except:
            return []


@admin.register(ColumnAcl)
class ColumnAclAdmin(GuardedModelAdmin):

    form = ColumnAclAdminForm

    list_display = (
        'layer',
        'project',
        'user',
        'group',
        'restricted_fields'
    )

    def project(self, obj):
        return obj.layer.project.title

    def has_add_permission(self, request, obj=None):
        return False

    project.short_description = _('Project')


@admin.register(Widget)
class WidgetAdmin(GuardedModelAdmin):
    list_display = (
        'name',
        'widget_type'
    )


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


@admin.register(FilterLayerSaved)
class FilterLayerSavedAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'layer',
        'qgs_expr',
        'created',
        'modified',
    )

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


@admin.register(QgisAuth)
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
            self.message_user(request, msg, django_messages.ERROR)
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
            self.message_user(request, msg, django_messages.ERROR)
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
            self.message_user(request, msg, django_messages.WARNING)
        return super(QgisAuthAdmin, self).has_delete_permission(request, obj) and (
            not obj or Layer.objects.filter(
                datasource__contains=obj.id).count() == 0
        )


class GeoConstraintAdmin(admin.ModelAdmin):
    model = GeoConstraint


class GeoConstraintRuleAdmin(admin.ModelAdmin):
    model = GeoConstraintRule


admin.site.register(GeoConstraint, GeoConstraintAdmin)
admin.site.register(GeoConstraintRule, GeoConstraintRuleAdmin)


class SingleLayerConstraintAdmin(admin.ModelAdmin):
    model = SingleLayerConstraint


class ConstraintExpressionRuleAdmin(admin.ModelAdmin):
    model = ConstraintExpressionRule


class ConstraintSubsetStringRuleAdmin(admin.ModelAdmin):
    model = ConstraintSubsetStringRule


admin.site.register(SingleLayerConstraint, SingleLayerConstraintAdmin)
admin.site.register(ConstraintExpressionRule, ConstraintExpressionRuleAdmin)
admin.site.register(ConstraintSubsetStringRule,
                    ConstraintSubsetStringRuleAdmin)


class LayerAclAdmin(admin.ModelAdmin):
    model = LayerAcl

    list_display = [
        'layer',
        'user',
        'group'
    ]


admin.site.register(LayerAcl, LayerAclAdmin)

class MessageAdmin(OrderedModelAdmin):
    model = Message

    list_display = ('title', 'level', 'move_up_down_links')
    ordering = ('order',)

admin.site.register(Message, MessageAdmin)

class ScaleVisibilityLayerConstraintAdmin(admin.ModelAdmin):

    model = ScaleVisibilityLayerConstraint

    list_display = ('layer', 'user', 'group', 'minscale', 'maxscale')

admin.site.register(ScaleVisibilityLayerConstraint, ScaleVisibilityLayerConstraintAdmin)