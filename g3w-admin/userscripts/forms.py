from django import forms
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout
from .models import UserScript

class UserScriptForm(forms.ModelForm):
    class Meta:
        model = UserScript
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.layout = Layout(
            'name',
            'type',
            'run_at',
            'code',
            'match',
            'is_active',
            'description',
        )
