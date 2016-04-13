from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.views.generic import (
    ListView,
)
from formtools.wizard.views import SessionWizardView
from guardian.shortcuts import get_objects_for_user
from collections import OrderedDict
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
        cduConfigCatastoLayerForm,
        cduCatastoLayerFieldsForm,
        cduAgainstLayerFieldsForm,
        cduAgainstLayerFieldsAliasForm
    ]
    file_storage = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'tmp_cdu_odt_file'))

    def get_form_kwargs(self, step=None):
        if step == '0':
            return {'request': self.request}
        elif step == '1':
            return {'project': self.get_cleaned_data_for_step('0')['project']}
        elif step == '2' or step == '3':
            toRet = {'catastoLayerFormData': self.get_cleaned_data_for_step('1')}
            if step == '3':
                toRet['catastoLayerFieldsFormData'] = self.get_cleaned_data_for_step('2')
            return toRet
        if step == '4':
            return {'againstLayerFieldFormData': self.get_cleaned_data_for_step('3'), 'catastoLayerFieldsFormData': self.get_cleaned_data_for_step('2')}
        else:
            return {}

    def get_form_initial(self, step):
        if 'slug' in self.kwargs:
            pass
        else:
            res = {}
            # case insert
            if step == '2':
                dataStep1 = self.get_cleaned_data_for_step('1')
                self.againstLayers = Layer.objects.filter(id__in=dataStep1['againstLayers'])
                for l in self.againstLayers:
                    res[unicode2ascii(l.name)] = l.name.capitalize().replace('_', ' ')
                return res
                dataStep3 = self.get_cleaned_data_for_step('3')
                for k, v in dataStep3.items():
                    for f in v:
                        res[f] = f
                return res

        return {}

    def get_context_data(self, form, **kwargs):
        context = super(CduConfigWizardView, self).get_context_data(form=form, **kwargs)

        # get data for older step
        context['data_step'] = OrderedDict()
        for step in range(0, int(context['wizard']['steps'].current)):
            context['data_step'][str(step)] = self.get_cleaned_data_for_step(str(step))

        return context