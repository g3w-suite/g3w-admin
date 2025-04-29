# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.apps import apps
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.gis import geos
from qdjango.models import Layer
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_out
from django.template import loader
from django.db.models.signals import pre_delete, post_save
from django.db.models.signals import pre_delete
from core.signals import (
    load_layer_actions,
    initconfig_plugin_start,
    after_serialized_project_layer,
    pre_save_maplayer,
    post_save_maplayer,
    pre_delete_maplayer,
    before_return_vector_data_layer,
    load_project_layers_actions,
    post_create_maplayerattributes
)
from qdjango.vector import LayerVectorView, MODE_CONFIG
from qdjango.models import GeoConstraintRule
from usersmanage.utils import get_user_groups
from .models import (
    G3WEditingFeatureLock,
    G3WEditingLayer,
    G3WEditingLog,
    EDITING_POST_DATA_DELETED,
    EDITING_ATOMIC_PERMISSIONS,
    EDITING_POST_DATA_UPDATED,
    EDITING_POST_DATA_ADDED,
)


from .utils import LayerLock

import logging

logger = logging.getLogger("module_editing")


@receiver(user_logged_out)
def unlock_feature(sender, **kwargs):
    """
    Unlock current featurelock by user on session unlocked
    """

    user = kwargs["user"]
    session_id = kwargs["request"].session.session_key
    editing_features_to_unlock = G3WEditingFeatureLock.objects.filter(
        user=user, sessionid=session_id
    )
    LayerLock.unLockExpiredFeatures(editing_features_to_unlock)


@receiver(load_layer_actions)
def editing_layer_actions(sender, **kwargs):
    """
    Return html actions editing for project layer.
    """

    editing_button = getattr(settings, "EDITING_SHOW_ACTIVE_BUTTON", True)

    # only admin and editor1 or editor2:
    if (
        sender.has_perm("change_project", kwargs["layer"].project)
        and kwargs["app_name"] == "qdjango"
        and kwargs["layer"].layer_type
        in (
            Layer.TYPES.postgres,
            Layer.TYPES.spatialite,
            Layer.TYPES.ogr,
            Layer.TYPES.mssql,
            Layer.TYPES.oracle,
        )
        and editing_button
    ):

        # add if is active
        try:
            G3WEditingLayer.objects.get(
                app_name=kwargs["app_name"], layer_id=kwargs["layer"].pk
            )
            kwargs["active"] = True
        except:
            kwargs["active"] = False

        template = loader.get_template("editing/layer_action.html")
        return template.render(kwargs)
    else:
        template = loader.get_template("editing/layer_action_blank.html")
        return template.render(kwargs)

@receiver(load_project_layers_actions)
def editing_project_layers_actions(sender, **kwargs):
    """
    Return html actions editing for project layers list.
    """

    editing_button = getattr(settings, 'EDITING_SHOW_ACTIVE_BUTTON', True)

    if (sender.has_perm('change_project', kwargs['project']) and
            kwargs['app_name'] == 'qdjango'
            and editing_button):
        template = loader.get_template('editing/project_layers_action.html')
        return template.render(kwargs)



@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """
    Set base editing data for initconfig
    """
    Project = apps.get_app_config(kwargs["projectType"]).get_model("project")
    project_layers = {
        pl.pk: pl for pl in Project.objects.get(pk=kwargs["project"]).layer_set.all()
    }

    # get every layer editable for the project, il list == 0 return
    layers_to_edit = G3WEditingLayer.objects.filter(app_name=kwargs["projectType"])
    editable_layers_id = []
    editable_layers_constraints = {}
    for el in layers_to_edit:

        # check for permissions
        if el.layer_id in project_layers and sender.request.user.has_perm(
            "change_layer", project_layers[el.layer_id]
        ):
            editable_layers_id.append(el.layer_id)

            # check if layers has constraints
            constraints = GeoConstraintRule.get_constraints_for_user(
                sender.request.user, project_layers[el.layer_id]
            )
            envelope = []
            for constraint in constraints:
                geom = constraint.get_constraint_geometry()
                if geom[1] > 0:
                    env = geom[0].envelope
                    xmin, ymin = env[0][0]
                    xmax, ymax = env[0][2]
                    if "xmin" in envelope and xmin > envelope["xmin"]:
                        xmin = envelope["xmin"]
                    if "ymin" in envelope and ymin > envelope["ymin"]:
                        ymin = envelope["ymin"]
                    if "xmax" in envelope and xmax < envelope["xmax"]:
                        xmax = envelope["xmax"]
                    if "ymax" in envelope and ymax < envelope["ymax"]:
                        ymax = envelope["ymax"]
                    envelope = [xmin, ymin, xmax, ymax]

            if len(envelope) > 0:
                # FIXME: if qgs_layer_id is not unique it shouldn't be used as a key here:
                editable_layers_constraints.update(
                    {
                        project_layers[el.layer_id].qgs_layer_id: {
                            "geometry_api_url": reverse(
                                "geoconstraint-api-geometry",
                                kwargs={"layer_id": el.layer_id},
                            ),
                            "bbox": envelope,
                        }
                    }
                )

    if len(editable_layers_id) == 0:
        return None

    toret = {
        "editing": {
            "gid": "{}:{}".format(kwargs["projectType"], kwargs["project"]),
        },
    }

    if len(editable_layers_constraints) > 0:
        toret["editing"]["constraints"] = editable_layers_constraints

    return toret


@receiver(after_serialized_project_layer)
def add_editable_capability(sender, **kwargs):
    """
    Add EDITABLE capability if layer is in editing layers and check grant for user
    """
    layer = kwargs["layer"]
    data = {
        "operation_type": "update",
        "values": {},
    }

    try:
        G3WEditingLayer.objects.get(app_name=layer._meta.app_label, layer_id=layer.pk)

        # check permission
        if kwargs["request"].user.has_perm("qdjango.change_layer", layer):
            data["values"]["capabilities"] = (
                sender.data["capabilities"] | settings.EDITABLE
            )
        else:
            logger.info(
                f"Layer {layer.qgs_layer_id} is not editable for user {kwargs['request'].user}"
            )

    except Exception:
        pass

    return data


@receiver(pre_delete)
def pre_delete_layer(sender, **kwargs):

    app_name = sender._meta.app_label
    if app_name in settings.G3WADMIN_PROJECT_APPS:
        if sender._meta.object_name == "Layer":
            try:
                G3WEditingLayer.objects.get(
                    app_name=app_name, layer_id=kwargs["instance"].pk
                ).delete()
            except:
                pass


@receiver(post_save_maplayer)
@receiver(pre_delete_maplayer)
def log_editing_layer(sender, **kwargs):
    """
    Save editing activities on database
    """
    if not hasattr(settings, "EDITING_LOGGING") or not settings.EDITING_LOGGING:
        return

    if "mode" not in kwargs:
        kwargs["mode"] = EDITING_POST_DATA_DELETED

    G3WEditingLog(
        user=kwargs["user"],
        mode=kwargs["mode"],
        msg=kwargs["data"],
        app_name="qdjango",
        layer_id=sender.layer.pk,
    ).save()


@receiver(pre_save_maplayer)
def validate_constraint(**kwargs):
    """Checks whether the instance validates the active constraints in commit mode
    kwargs: ["layer_metadata", "mode", "data", "user"]
    """

    mode = kwargs["mode"]
    if mode not in (EDITING_POST_DATA_UPDATED, EDITING_POST_DATA_ADDED):
        return

    editing_layer = Layer.objects.get(pk=kwargs["layer_metadata"].layer_id)
    user = kwargs["user"]

    # check rule presence for layer
    rules = GeoConstraintRule.get_active_constraints_for_user(
        user, editing_layer, context="e"
    )

    if len(rules) == 0:
        return

    coords = kwargs["data"]["feature"]["geometry"]["coordinates"]
    geom_type = kwargs["data"]["feature"]["geometry"]["type"]
    geom_class = getattr(geos, geom_type)

    # For multi geometry type
    if geom_type == "Polygon":
        coords = coords[0]

    if geom_type == "MultiPolygon":
        Polygon = getattr(geos, "Polygon")
        coords = [Polygon(p) for p in coords[0]]

    if geom_type == "MultiLineString":
        LineString = getattr(geos, "LineString")
        coords = [LineString(p) for p in coords]

    if geom_type == "MultiPoint":
        Point = getattr(geos, "Point")
        coords = [Point(p) for p in coords]

    # set spatial predicate for validation
    spatial_predicate = getattr(
        settings, "EDITING_CONSTRAINT_SPATIAL_PREDICATE", "contains"
    )

    for rule in rules:
        allowed_geom, __ = rule.get_constraint_geometry()
        geom = geom_class(coords)
        geom.srid = allowed_geom.srid
        predicate_method = getattr(allowed_geom, spatial_predicate)
        if not predicate_method(geom):
            raise IntegrityError(
                _("Constraint validation failed for geometry: %s") % geom.wkt
            )


@receiver(pre_save_maplayer)
def fill_logging_fields(sender, **kwargs):
    """
    Fill data with <username>|<timestamp_operation> for editing/insert field
    if they were saved into editing configuration
    """

    mode = kwargs["mode"]
    user = kwargs["user"]
    user_groups = ", ".join([g.name for g in get_user_groups(user)])
    try:
        el = G3WEditingLayer.objects.get(
            app_name="qdjango", layer_id=kwargs["layer_metadata"].layer_id
        )
        if mode == EDITING_POST_DATA_ADDED:

            # Set the user and user group
            # ---------------------------
            if el.add_user_field:
                kwargs["data"]["feature"]["properties"][
                    el.add_user_field
                ] = f"{user.username}"

                # Remove edit_user_field property if is active
                if el.edit_user_field:
                    del kwargs["data"]["feature"]["properties"][el.edit_user_field]

            if el.add_user_group_field:
                kwargs["data"]["feature"]["properties"][
                    el.add_user_group_field
                ] = f"{user_groups}"

                # Remove edit_user_field property if is active
                if el.edit_user_group_field:
                    del kwargs["data"]["feature"]["properties"][el.edit_user_group_field]


        if mode == EDITING_POST_DATA_UPDATED:

            # Set the user and user group
            # ---------------------------
            if el.edit_user_field:
                kwargs['data']['feature']['properties'][el.edit_user_field] = f"{user.username}"

                # Remove add_user_field property if is active
                if el.add_user_field:
                    del(kwargs['data']['feature']['properties'][el.add_user_field])

            if el.edit_user_group_field:
                kwargs['data']['feature']['properties'][el.edit_user_group_field] = f"{user_groups}"

                # Remove add_user_field property if is active
                if el.add_user_group_field:
                    del (kwargs['data']['feature']['properties'][el.add_user_group_field])

    except Exception as e:
        logger.error(f"[EDITING] - FILL LOGGING FIELDS: {e}")


@receiver(before_return_vector_data_layer)
def add_constraints(**kwargs):
    """
    Add constraints params to MODE_CONFIG response vectorlayer and capabilities is editing module is active
    :return: dict with constraints data
    :rtype: dict, None
    """
    # check if is instance of layerVectorView
    if (
        not isinstance(kwargs["sender"], LayerVectorView)
        and kwargs["sender"].mode_call != MODE_CONFIG
    ):
        return None

    layer = kwargs["sender"].layer
    toret = {
        "constraints": {},
    }

    try:
        editinglayer = G3WEditingLayer.objects.get(
            app_name="qdjango", layer_id=layer.pk
        )
        if editinglayer.scale:
            toret["constraints"].update({"scale": editinglayer.scale})

        return toret
    except:
        return None


@receiver(before_return_vector_data_layer)
def add_atomic_capabilities(**kwargs):
    """
    Add atomic editing permisions to MODE_CONFIG response vectorlayer
    :return: list with atomic permissions
    :rtype: dict, None
    """
    # check if is instance of layerVectorView
    if (
        not isinstance(kwargs["sender"], LayerVectorView)
        and kwargs["sender"].mode_call != MODE_CONFIG
    ):
        return None

    layer = kwargs["sender"].layer
    toret = {
        "capabilities": [],
    }

    try:
        for ap in EDITING_ATOMIC_PERMISSIONS:
            if kwargs["sender"].request.user.has_perm(ap, layer):
                toret["capabilities"].append(ap)
        return toret
    except:
        return None


@receiver(post_save, sender=G3WEditingLayer)
@receiver(pre_delete, sender=G3WEditingLayer)
def invalid_prj_cache(**kwargs):
    """Invalid the possible qdjango project cache"""

    layer = Layer.objects.get(pk=kwargs["instance"].layer_id)
    layer.project.invalidate_cache()
    logging.getLogger("g3wadmin.debug").debug(
        f"Qdjango project /api/config invalidate on update/delete of a editing layer state: "
        f"{layer.project}"
    )

@receiver(post_create_maplayerattributes)
def set_editing_visible_status(**kwargs):
    """
    Add status 'visible to layer definition in /vector/api/config'
    """

    # Check for layer editing capabilities are active
    try:
        el = G3WEditingLayer.objects.get(
            app_name="qdjango", layer_id=kwargs["layer"].pk
        )

        kwargs['vector_params'].update({
            'editing': {
                'visible': el.visible,
                'layer_style': el.style,
            }
        })

    except:
        return None
