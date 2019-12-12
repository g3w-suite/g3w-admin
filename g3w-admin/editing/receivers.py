# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.apps import apps
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.gis import geos
from qdjango.models import Layer
from django.utils.translation import ugettext_lazy as _
from django.conf import settings
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_out
from django.template import loader
from django.db.models.signals import pre_delete
from core.signals import load_layer_actions, initconfig_plugin_start, after_serialized_project_layer, \
    post_save_maplayer, pre_delete_maplayer, load_js_modules, before_return_vector_data_layer
from qdjango.models import Layer
from qdjango.api.serializers import QGIS_LAYER_TYPE_NO_GEOM
from qdjango.vector import LayerVectorView, MODE_CONFIG
from .models import G3WEditingFeatureLock, G3WEditingLayer, G3WEditingLog, EDITING_POST_DATA_DELETED, ConstraintRule

from .utils import LayerLock


@receiver(load_js_modules)
def get_js_modules(sender, **kwargs):

    return 'editing/js/widget.js'


@receiver(user_logged_out)
def unlock_feature(sender, **kwargs):
    """
    Unlock current featurelock by user on session unlocked
    """

    user = kwargs['user']
    session_id = kwargs['request'].session.session_key
    editing_features_to_unlock = G3WEditingFeatureLock.objects.filter(user=user, sessionid=session_id)
    LayerLock.unLockExpiredFeatures(editing_features_to_unlock)


@receiver(load_layer_actions)
def editing_layer_actions(sender, **kwargs):
    """
    Return html actions editing for project layer.
    """

    editing_button = getattr(settings, 'EDITING_SHOW_ACTIVE_BUTTON', True)

    # only admin and editor1 or editor2:
    if sender.has_perm('change_project', kwargs['layer'].project) and kwargs['app_name'] == 'qdjango' and \
                    kwargs['layer'].layer_type in (
                        Layer.TYPES.postgres,
                        Layer.TYPES.spatialite
                    ) and editing_button:
         #and kwargs['layer'].geometrytype != QGIS_LAYER_TYPE_NO_GEOM
        # and kwargs['layer'].project.group.srid.auth_srid == kwargs['layer'].srid

        # add if is active
        try:
            G3WEditingLayer.objects.get(app_name=kwargs['app_name'], layer_id=kwargs['layer'].pk)
            kwargs['active'] = True
        except:
            kwargs['active'] = False

        template = loader.get_template('editing/layer_action.html')
        return template.render(kwargs)
    else:
        template = loader.get_template('editing/layer_action_blank.html')
        return template.render(kwargs)


@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """
    Set base editing data for initconfig
    """
    Project = apps.get_app_config(kwargs['projectType']).get_model('project')
    project_layers = {pl.pk: pl for pl in Project.objects.get(pk=kwargs['project']).layer_set.all()}

    # get every layer editable for the project, il list == 0 return
    layers_to_edit = G3WEditingLayer.objects.filter(app_name=kwargs['projectType'])
    editable_layers_id = []
    editable_layers_constraints = {}
    for el in layers_to_edit:

        # check for permissions
        if el.layer_id in project_layers and sender.request.user.has_perm('change_layer', project_layers[el.layer_id]):
            editable_layers_id.append(el.layer_id)

            # check if layers has constraints
            constraints = ConstraintRule.get_constraints_for_user(sender.request.user, project_layers[el.layer_id])
            envelope = []
            for constraint in constraints:
                geom = constraint.get_constraint_geometry()
                if geom[1] > 0:
                    env = geom[0].envelope
                    xmin, ymin = env[0][0]
                    xmax, ymax = env[0][2]
                    if 'xmin' in envelope and xmin > envelope['xmin']:
                        xmin = envelope['xmin']
                    if 'ymin' in envelope and ymin > envelope['ymin']:
                        ymin = envelope['ymin']
                    if 'xmax' in envelope and xmax < envelope['xmax']:
                        xmax = envelope['xmax']
                    if 'ymax' in envelope and ymax < envelope['ymax']:
                        ymax = envelope['ymax']
                    envelope = [xmin, ymin, xmax, ymax]

            if len(envelope) > 0:
                editable_layers_constraints.update({
                    project_layers[el.layer_id].qgs_layer_id: {
                    'geometry_api_url': reverse('constraint-api-geometry', kwargs={'editing_layer_id': el.layer_id}),
                    'bbox': envelope
                    }
                })



    if len(editable_layers_id) == 0:
        return None

    toret = {
        'editing': {
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
        },
    }

    if len(editable_layers_constraints) > 0:
        toret['editing']['constraints'] = editable_layers_constraints

    return toret


@receiver(after_serialized_project_layer)
def add_editable_capability(sender, **kwargs):
    """
    Add EDITABLE capability if layer is in editing layers
    """
    layer = kwargs['layer']
    data = {
        'operation_type': 'update',
        'values': {},
    }

    editable_layers_id = [el.layer_id for el in G3WEditingLayer.objects.filter(app_name=layer._meta.app_label)]

    # get config if exists:
    if layer.pk in editable_layers_id:
        data['values']['capabilities'] = sender.data['capabilities'] | settings.EDITABLE
    return data


@receiver(pre_delete)
def pre_delete_layer(sender, **kwargs):

    app_name = sender._meta.app_label
    if app_name in settings.G3WADMIN_PROJECT_APPS:
        if sender._meta.object_name == 'Layer':
            try:
                G3WEditingLayer.objects.get(app_name=app_name, layer_id=kwargs['instance'].pk).delete()
            except:
                pass


@receiver(post_save_maplayer)
@receiver(pre_delete_maplayer)
def log_editing_layer(sender, **kwargs):
    """
    Save editing activities on database
    """
    if not hasattr(settings, 'EDITING_LOGGING') or not settings.EDITING_LOGGING:
        return

    if 'mode' not in kwargs:
        kwargs['mode'] = EDITING_POST_DATA_DELETED

    G3WEditingLog(user=kwargs['user'], mode=kwargs['mode'], msg=kwargs['data'], app_name='qdjango',
                  layer_id=kwargs['layer']).save()


@receiver(post_save_maplayer)
def validate_constraint(**kwargs):
    """Checks whether the instance validates the active constraints in commit mode
    kwargs: ["layer_id", "mode", "data", "user"]
    """
    mode = kwargs['mode']
    if mode not in ('update', 'add'):
        return

    editing_layer = Layer.objects.get(pk=kwargs['layer'])
    user = kwargs['user']

    # check rule presence for layer
    rules = ConstraintRule.get_active_constraints_for_user(user, editing_layer)

    if len(rules) == 0:
        return

    coords = kwargs['data']['feature']['geometry']['coordinates']
    geom_type = kwargs['data']['feature']['geometry']['type']
    geom_class = getattr(geos, geom_type)

    if geom_type == 'MultiPolygon':
        Polygon = getattr(geos, 'Polygon')
        coords = [Polygon(p) for p in coords[0]]

    # set saptial predicate for validation
    spatial_predicate = getattr(settings, 'EDITING_CONSTRAINT_SPATIAL_PREDICATE', 'contains')

    for rule in rules:
        allowed_geom, __ = rule.get_constraint_geometry()
        geom = geom_class(coords)
        geom.set_srid(allowed_geom.srid)
        predicate_method = getattr(allowed_geom, spatial_predicate)
        if not predicate_method(geom):
            raise IntegrityError( _('Constraint validation failed for geometry: %s') % geom.wkt)


@receiver(before_return_vector_data_layer)
def add_constraints(**kwargs):
    """
    Add contraints params to MODE_CONFIG response vectorlayer
    """
    # check if is instance of layerVectorView
    if not isinstance(kwargs['sender'], LayerVectorView) and kwargs['sender'].mode_call != MODE_CONFIG:
        return None

    layer = kwargs['sender'].layer
    toret = {
        'constraints': {}
    }

    try:
        editinglayer = G3WEditingLayer.objects.get(app_name='qdjango', layer_id=layer.pk)
        if editinglayer.scale:
            toret['constraints'].update({
                'scale': editinglayer.scale
            })

        return toret
    except:
        return None



