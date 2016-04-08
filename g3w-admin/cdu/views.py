from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.views.generic import (
    ListView,
)
from formtools.wizard.views import SessionWizardView
from guardian.shortcuts import get_objects_for_user
from .models import *
from .forms import *

class CduConfigList(ListView):

    template_name = 'cdu/config_list.html'

    def get_queryset(self):
        return get_objects_for_user(self.request.user,'cdu.view_configs', Configs).order_by('title')


class CduConfigWizardView(SessionWizardView):
    """
    Wizard forms for CDU configuration managment
    """
    template_name = 'cdu/config_wizard.html'
    form_list = [
        cduConfigInitForm,
        cduConfigCatastoLayerForm
    ]
    file_storage = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'tmp_cdu_odt_file'))

    def get_form_kwargs(self, step=None):
        if step == '0':
            return {'request': self.request}
        elif step == '1':
            return {'project': self.get_cleaned_data_for_step('0')['project']}
        else:
            return {}