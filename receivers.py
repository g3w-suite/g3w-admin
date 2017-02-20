from django.dispatch import receiver
from core.signals import initconfig_plugin_start
from .models import Configs


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
                'name': config.title,
                'layerCatasto': layer_catasto.layer.qgs_layer_id,
                'search': {
                    'filter': {
                        'AND': [
                            {
                                'attribute': layer_catasto.getFieldFoglio(),
                                'input': {
                                    'type': 'textField',
                                    'options': {
                                        'blanktext': ''
                                    }
                                }
                            },
                            {
                                'attribute': layer_catasto.getFieldParticella(),
                                'input': {
                                    'type': 'textField',
                                    'options': {
                                        'blanktext': ''
                                    }
                                }
                            }
                        ]

                    }
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