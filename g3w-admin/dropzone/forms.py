import json
import uuid

from django import forms
from django.template import loader, Context


class DropzoneInput(forms.TextInput):
    template_name = 'dropzone/dropzone.html'

    def __init__(self, *args, **kwargs):
        self.dropzone_config = kwargs.pop("dropzone_config", {})
        self.uid = uuid.uuid4()
        super(DropzoneInput, self).__init__()

    def render(self, name, value, attrs=None):
        if value is None:
            value = ''

        c = Context({
            "dropzone_config_json": json.dumps(self.dropzone_config),
            "name": name,
            "value": value,
            "uid": self.uid
        })

        t = loader.get_template(self.template_name)

        return t.render(c)
