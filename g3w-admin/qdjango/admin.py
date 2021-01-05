from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from django.forms import ModelForm, TextInput, CharField
from .models import *
import ast


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


admin.site.register(QgisAuth, QgisAuthAdmin)
