from django.apps import apps
from django.template import loader
from django.dispatch import receiver
from django.conf import settings
from django.db.models.signals import pre_delete, post_save
from core.signals import load_layer_actions, after_serialized_project_layer
from caching.models import G3WCachingLayer
from caching.utils import get_config

@receiver(load_layer_actions)
def editingLayerAction(sender, **kwargs):
    """
    Return html actions editing for project layer.
    """

    # only admin and editor1 or editor2:
    if sender.has_perm('change_project', kwargs['layer'].project):

        try:
            app_configs = apps.get_app_config(kwargs['app_name']).configs
        except:
            app_configs = object()

        # add if is active
        try:
            G3WCachingLayer.objects.get(app_name=kwargs['app_name'], layer_id=kwargs['layer'].pk)
            kwargs['active'] = True
        except:
            kwargs['active'] = False

        kwargs['as_col'] = True

        # update with app_configs
        if hasattr(app_configs, 'CACHING_LAYER_ACTION'):
            kwargs.update(app_configs.CACHING_LAYER_ACTION)

        template = loader.get_template('caching/layer_action.html')
        return template.render(kwargs)


@receiver(after_serialized_project_layer)
def add_caching_urls(sender, **kwargs):
    """
    Receiver to add caching data and url.
    """
    layer = kwargs['layer']
    data = {
        'operation_type': 'update',
        'values': {},
    }

    # get config if exists:
    caching_layers = {str(cl): cl for cl in G3WCachingLayer.objects.all()}
    layer_key_name = "{}{}".format(layer._meta.app_label, layer.pk)
    if layer_key_name in caching_layers.keys():
        data['values'] = {'cache_url': '/{}caching/api/{}'.format(settings.SITE_PREFIX_URL if settings.SITE_PREFIX_URL else '', layer_key_name)}
    return data


@receiver(pre_delete)
def pre_delete_layer(sender, **kwargs):
    """
    Delete caching_layer  record when layer is deleted.
    :param sender:
    :param kwargs:
    :return:
    """
    app_name = sender._meta.app_label
    if app_name in settings.G3WADMIN_PROJECT_APPS:
        if sender._meta.object_name == 'Layer':
            try:
                G3WCachingLayer.objects.get(app_name=app_name, layer_id=kwargs['instance'].pk).delete()
            except:
                pass


@receiver(post_save)
def post_save_layer(sender, **kwargs):
    """
    Delete caching_layer  record when layer is deleted.
    :param sender:
    :param kwargs:
    :return:
    """
    app_name = sender._meta.app_label
    if app_name in settings.G3WADMIN_PROJECT_APPS:
        if sender._meta.object_name == 'Layer':
            try:
                tilestache_cfg = get_config()
                layer_key_name = '{}{}'.format(sender._meta.app_label, kwargs['instance'].pk)
                if layer_key_name in tilestache_cfg.config.layers:
                    tilestache_cfg.erase_cache_layer(layer_key_name)
            except:
                pass
