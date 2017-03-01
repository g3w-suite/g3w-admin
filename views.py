from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.core.urlresolvers import reverse
from django.db import transaction
from django.http.response import HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from django.views.generic import (
    ListView,
    DetailView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.views.decorators.csrf import csrf_exempt
from qdjango.models import *
from django.utils.decorators import method_decorator
from formtools.wizard.views import SessionWizardView
from guardian.decorators import permission_required
from guardian.shortcuts import get_objects_for_user
from collections import OrderedDict
from core.api.views import G3WAPIView
from core.api.authentication import CsrfExemptSessionAuthentication
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from usersmanage.mixins.views import G3WACLViewMixin
from .api.permissions import MakeCDUPermission
from .utils.cdu import CDU, ODT
from .models import Configs, Layers as CDULayers
from .forms import *

import json


class CduConfigList(ListView):

    template_name = 'cdu/config_list.html'

    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'cdu.view_configs', Configs).order_by('title')


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

    editor_permission = ['change_configs', 'view_configs']
    viewer_permission = 'view_configs'

    def dispatch(self, request, *args, **kwargs):
        if 'slug' in kwargs:
            self.currentCduConfig = Configs.objects.get(slug=kwargs['slug'])
            if not request.user.has_perm('cdu.change_configs', self.currentCduConfig):
                return HttpResponseForbidden()
        else:
            if not request.user.has_perm('cdu.add_configs'):
                return HttpResponseForbidden()
        return super(CduConfigWizardView, self).dispatch(request, *args, **kwargs)

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
            return {'againstLayerFieldFormData': self.get_cleaned_data_for_step('3'),
                    'catastoLayerFieldsFormData': self.get_cleaned_data_for_step('2')}
        else:
            return {}

    def get_form_initial(self, step):
        if 'slug' in self.kwargs:
            if step == '0':

                kwargs = dict()
                # get viewer users
                viewers = get_users_for_object(self.currentCduConfig, self.viewer_permission,
                                               [G3W_VIEWER1, G3W_VIEWER2])
                kwargs['viewer_users'] = [o.id for o in viewers]

                # get editor users
                if self.request.user.is_superuser:
                    editor_users = get_users_for_object(self.currentCduConfig, self.editor_permission,
                                                        [G3W_EDITOR2, G3W_EDITOR1])
                    if editor_users:
                        kwargs['editor_user'] = editor_users[0].id
                return kwargs

            elif step == '1':

                # get layers
                self.layerCatasto = self.currentCduConfig.layer_catasto()
                self.againstLayers = self.currentCduConfig.layers_against()
                return {
                    'catastoLayer': self.layerCatasto.layer.pk if self.layerCatasto is not None else None,
                    'againstLayers': [l.layer.pk for l in self.againstLayers]
                }
            elif step == '2':
                res = {
                    'foglio': self.layerCatasto.getFieldFoglio(),
                    'particella': self.layerCatasto.getFieldParticella(),
                    'plusFieldsCatasto': [pf['name'] for pf in self.layerCatasto.getPlusFieldsCatasto()]
                }
                #add alias
                for l in self.againstLayers:
                    res[unicode2ascii(l.layer.name)] = l.alias
                return res
            elif step == '3':
                res = {}
                #add alias
                for l in self.againstLayers:
                    fields = l.getLayerFieldsData()
                    res[unicode2ascii(l.layer.name)] = [f['name'] for f in fields]
                #add alias for plusFieldsCatasto:
                plusFieldsCatasto = self.layerCatasto.getPlusFieldsCatasto()
                for pf in plusFieldsCatasto:
                    res[unicode2ascii('plusFieldsCatasto_{}'.format(pf['name']))] = pf['alias']
                return res
            elif step == '4':
                res = {}
                #add alias
                for l in self.againstLayers:
                    fields = l.getLayerFieldsData()
                    for f in fields:
                        res[unicode2ascii(f['name'])] = f['alias']
                return res
        else:
            res = {}
            # case insert
            if step == '2':
                dataStep1 = self.get_cleaned_data_for_step('1')
                self.againstLayers = Layer.objects.filter(id__in=dataStep1['againstLayers'])
                for l in self.againstLayers:
                    res[unicode2ascii(l.name)] = l.name.capitalize().replace('_', ' ')
            elif step == '3':
                dataStep2 = self.get_cleaned_data_for_step('2')
                for f in dataStep2['plusFieldsCatasto']:
                    res['plusFieldsCatasto_{}'.format(f)] = f.capitalize().replace('_', ' ')
            elif step == '4':
                dataStep3 = self.get_cleaned_data_for_step('3')
                for k, v in dataStep3.items():
                    for f in v:
                        res[f] = f.capitalize().replace('_', ' ')
            return res
        return {}

    def get_form_instance(self, step):
        if 'slug' in self.kwargs:
            if step == '0':
                return self.currentCduConfig

    def get_context_data(self, form, **kwargs):
        context = super(CduConfigWizardView, self).get_context_data(form=form, **kwargs)

        # get data for older step
        context['data_step'] = OrderedDict()
        for step in range(0, int(context['wizard']['steps'].current)):
            try:
                stepContexData = getattr(self, '_getContextDataStep{}'.format(str(step)))()
            except:
                stepContexData = self.get_cleaned_data_for_step(str(step))
            context['data_step'][str(step)] = stepContexData

        return context

    def _getContextDataStep0(self):
        rawData = self.get_cleaned_data_for_step('0')
        return {
            'title': rawData['title'],
            'project': Project.objects.get(pk=rawData['project']),
            'odtfile': rawData['odtfile']
        }

    def _getContextDataStep1(self):
        rawData = self.get_cleaned_data_for_step('1')
        return {
            'catastoLayer': Layer.objects.get(pk=rawData['catastoLayer']),
            'againstLayers': Layer.objects.filter(pk__in=rawData['againstLayers']),
        }

    def _getContextDataStep2(self):
        rawData = self.get_cleaned_data_for_step('2')
        angainstLayerAlias = {key: value for key, value in rawData.items() if key not in ['foglio',
                                                                                          'particella',
                                                                                          'plusFieldsCatasto']}
        return {
            'foglio': rawData['foglio'],
            'particella': rawData['particella'],
            'plusFieldsCatasto': rawData['plusFieldsCatasto'],
            'angainstLayerAlias': angainstLayerAlias
        }

    def _create_update_or_delete_cdulayers(self, layers_data):

        CDULayers_id_saved = list()
        for layer_data in layers_data:
            CDUlayer, created = CDULayers.objects.get_or_create(
                layer=layer_data['layer'],
                config=layer_data['config'],
                defaults=layer_data['defaults']
                )
            if not created:
                CDUlayer.alias = layer_data['defaults'].get('alias', None)
                CDUlayer.fields = layer_data['defaults']['fields']
                CDUlayer.catasto = layer_data['defaults'].get('catasto', False)

                # Save layer
                CDUlayer.save()

            CDULayers_id_saved.append(CDUlayer.pk)

        # erase old layer
        layer_data['config'].layers_set.exclude(pk__in=CDULayers_id_saved).delete()

    def _serializeCatastoLayerFields(self, form_list):
        return {
            'foglio': form_list[2].cleaned_data['foglio'],
            'particella': form_list[2].cleaned_data['particella'],
            'plusFieldsCatasto': self._serializePlusFieldsCatastoFields(form_list)}

    def _serializeAgainstLayerFields(self, form_list, layer):
        aliasFields = form_list[4].fieldsByLayers[unicode2ascii(layer.name)]
        toSerialize = []
        for field in aliasFields:
            toSerialize.append({'name': field, 'alias': form_list[4].cleaned_data[unicode2ascii(field)]})
        return toSerialize

    def _serializePlusFieldsCatastoFields(self,form_list):
        plusFieldsCatastoFields = form_list[2].cleaned_data['plusFieldsCatasto']
        toSerialize = []
        for field in plusFieldsCatastoFields:
            aliasPlusFieldsCatastoFieldName = unicode2ascii('plusFieldsCatasto_{}'.format(field))
            toSerialize.append({'name':field,'alias':form_list[3].cleaned_data[aliasPlusFieldsCatastoFieldName]})
        return toSerialize

    def _prepairAgainstLayersData(self,form_list, cduConfig):
        res = []
        for lid in form_list[1].cleaned_data['againstLayers']:
            layer = Layer.objects.get(pk=lid)
            res.append({
                'config': cduConfig,
                'layer': layer,
                'defaults': {
                    'fields': self._serializeAgainstLayerFields(form_list, layer),
                    'alias': form_list[2].cleaned_data[unicode2ascii(layer.name)]
                }
            })
        return res

    def done(self, form_list, form_dict, **kwargs):
        """
        Wizard end star save data on db
        :param form_list:
        :param form_dict:
        :param kwargs:
        :return:
        """
        # build data for to save results
        with transaction.atomic():
            cdu_config = form_list[0].save()

            # configure data for Layers table
            layers_data = list()

            # build catasto layer data
            layers_data.append({
                'config': cdu_config,
                'layer': Layer.objects.get(pk=form_list[1].cleaned_data['catastoLayer']),
                'defaults': {
                    'fields': self._serializeCatastoLayerFields(form_list),
                    'catasto': True
                }
            })

            #build against layers_data
            layers_data += self._prepairAgainstLayersData(form_list, cdu_config)
            self._create_update_or_delete_cdulayers(layers_data)

        return HttpResponseRedirect(reverse('cdu-config-list'))


class CduConfigDetailView(DetailView):
    model = Configs
    template_name = 'cdu/config_detail.html'

    @method_decorator(permission_required('cud.view_configs', (Configs, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(CduConfigDetailView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(CduConfigDetailView, self).get_context_data(**kwargs)
        return context


class CduConfigDeleteView(G3WAjaxDeleteViewMixin, G3WRequestViewMixin, SingleObjectMixin, View):
    '''
    Delete group Ajax view
    '''
    model = Configs

    @method_decorator(permission_required('cud.delete_configs', (Configs, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(CduConfigDeleteView, self).dispatch(*args, **kwargs)


class CduCalculateApiView(G3WAPIView):

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        MakeCDUPermission,
    )

    def post(self, request, **kwargs):

        features = json.loads(request.POST['features'])
        config = Configs.objects.get(pk=kwargs['id'])

        o_cdu = CDU(config)
        o_cdu.add_particelle(features)
        o_cdu.calculate()
        o_cdu.save_in_session(request)



        return JsonResponse(o_cdu.results)


class CduCreatedocView(View):
    """
    Create odt document with calculation results.
    """

    @method_decorator(permission_required('cud.make_cdu', (Configs, 'pk', 'id'), return_403=True))
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(CduCreatedocView, self).dispatch(*args, **kwargs)

    def post(self, request, **kwargs):

        # get cd config object
        config = Configs.objects.get(pk=kwargs['id'])

        o_cdu = CDU(config)
        results = o_cdu.get_from_session(request)

        # get selected rows
        selected_results_ids = request.POST['id'].split(',')

        odt = ODT(config, results)

        odt.write_document()

        return odt.response()




