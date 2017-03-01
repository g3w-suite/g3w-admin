from django.dispatch import receiver
from django.core.urlresolvers import reverse
from django.template import loader, Context, RequestContext
from guardian.shortcuts import get_objects_for_user
from core.signals import initconfig_plugin_start, load_dashboard_widgets, load_js_modules
from core.views import DashboardView
from .models import Configs


@receiver(load_js_modules)
def get_js_modules(sender, **kwargs):

    return 'cdu/js/widget.js'


@receiver(load_dashboard_widgets)
def dashboard_widget(sender, **kwargs):

    if isinstance(sender, DashboardView):

        data = get_objects_for_user(sender.request.user, 'cdu.view_configs', Configs).order_by('title')


        context = RequestContext(request=sender.request, dict_={
            'data': data
        })

        widget = loader.get_template('cdu/widgets/dashboard.html')
        return widget.render(context)


@receiver(initconfig_plugin_start)
def set_init_config_value(sender, **kwargs):

    # get config data
    # todo: better apply filter by user
    configs = Configs.objects.filter(project_id=kwargs['project'])

    if len(configs) == 0:
        return None


    # check permissions on project for to render plugins data
    '''
    if not sender.request.user.has_perm('qdjango.edit_iternet_layers', data.project) and not \
            sender.request.user.has_perm('qdjango.change_project', data.project):
        return None
    '''

    ret = {
        'cdu': {
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
            'configs': list()
        }
    }

    for config in configs:
        layer_catasto = config.layer_catasto()

        config_ret = {
                'id': config.id,
                'name': config.title,
                'api': reverse('cdu-api-calculate-id', kwargs={'id': config.pk}),
                'docurl': reverse('cdu-config-createdoc', kwargs={'id': config.pk}),
                'layerCatasto': layer_catasto.layer.qgs_layer_id,
                'search': {
                    'id': config.title,
                    'name': 'Ricerca per foglio e particella catastali',
                    'options': {
                        'layerid': layer_catasto.layer.qgs_layer_id,
                        'querylayerid': layer_catasto.layer.qgs_layer_id,
                        'queryurl': None,
                        'filter': {
                            'AND': [
                                {
                                    'attribute': layer_catasto.getFieldFoglio(),
                                    'op': 'eq',
                                    'label': 'Foglio',
                                    'input': {
                                        'type': 'textfield',
                                        'options': {
                                            'blanktext': ''
                                        }
                                    }
                                },
                                {
                                    'attribute': layer_catasto.getFieldParticella(),
                                    'op': 'eq',
                                    'label': 'Numero',
                                    'input': {
                                        'type': 'textfield',
                                        'options': {
                                            'blanktext': ''
                                        }
                                    }
                                }
                            ]

                        }
                    },

                },
                'results': {
                    'layers': []
                }
            }


        layers_against = config.layers_against()

        for layer in layers_against:
            config_ret['results']['layers'].append({
                layer.layer.origname: {
                    'name': layer.layer.name,
                    'title': layer.alias,
                    'id': layer.layer.qgs_layer_id,
                    'fields': layer.getLayerFieldsData()
                }
            })

        ret['cdu']['configs'].append(config_ret)

    return ret