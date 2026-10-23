""""GeoConstraints module models

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


import logging

from django.conf import settings
from django.contrib.auth.models import Group as AuthGroup, User
from django.contrib.gis.db.models.fields import GeometryField
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.exceptions import ValidationError
from django.db import connection, models, transaction
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from qgis.core import (
    QgsFeatureRequest,
    QgsMultiPolygon,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsCoordinateTransformContext,
    QgsExpression,
    QgsRectangle
)

from core.utils.qgisapi import get_qgis_features, get_qgis_layer
from qdjango.models import Layer


logger = logging.getLogger(__name__)


CONSTRAINT_LAYER_TYPE_GRANTED = (
    'spatialite',
    'postgres',
    'ogr',
    'oracle'
)

class GeoConstraint(models.Model):
    """Main GeoConstraint class. Links together two layers: the editing layer and the constraint layer.
    """

    active = models.BooleanField(default=True)
    layer = models.ForeignKey(
        Layer, on_delete=models.CASCADE, related_name='editing_layer')
    description = models.TextField(_('Description'), null=True, blank=True)
    constraint_layer = models.ForeignKey(
        Layer, on_delete=models.CASCADE, related_name='constraint_layer')

    for_view = models.BooleanField(_('Active for visualization'), default=True, null=True,
                                   help_text=_(
                                       'Active this constraint for users have viewing grant on layer/project'))
    for_editing = models.BooleanField(_('Active for editing'), default=False, null=True,
                                      help_text=_(
                                          'Active this constraint for users have editing grant on layer/project'))
    autozoom = models.BooleanField(_('Autozoom on map boostrap'), default=False, null=True,
                                      help_text=_(
                                          'Active this to make possible auto zoom on geometric constraint '
                                          '(combining every rule) for user on map boostrap'))


    @property
    def layer_qgs_layer_id(self):
        """Return the QGIS layer id for editing layer"""

        return self.layer.qgs_layer_id

    @property
    def constraint_layer_qgs_layer_id(self):
        """Return the QGIS layer id for constraint layer"""

        return self.constraint_layer.qgs_layer_id

    @property
    def constraint_layer_name(self):
        """Return the QGIS layer name for constraint layer"""

        return self.constraint_layer.name

    @property
    def constraint_rule_count(self):
        """Return the rules count for constraint"""

        return self.geoconstraintrule_set.count()

    def clean(self):
        """Make sure the layer is either PG or SL and check that constraint layer is Polygon"""

        if self.layer.layer_type not in CONSTRAINT_LAYER_TYPE_GRANTED or self.constraint_layer.layer_type not in CONSTRAINT_LAYER_TYPE_GRANTED:
            raise ValidationError(
                _('Layers types must be spatialite or postgres'))

        if 'Polygon' not in self.constraint_layer.geometrytype:
            raise ValidationError(
                _('Constraint layer geometry type must be Polygon or MultiPolygon'))

        if self.layer.pk == self.constraint_layer.pk:
            raise ValidationError(
                _('Editing and constraints layer cannot be the same layer'))

        # add for_view and for_editing cleaning
        if not self.for_view and not self.for_editing:
            raise ValidationError(_('Almonst one of fields for_view and for_editing it must be True'))

    def __str__(self):
        return "%s, %s" % (self.layer, self.constraint_layer)

    class Meta:
        managed = True
        verbose_name = _('Layer geoconstraint')
        verbose_name_plural = _('Layer geoconstraints')
        app_label = 'qdjango'


class GeoConstraintRule(models.Model):
    """Constraint rule class: links the constraint with a user or a group and
    defines the constraint SQL rule"""

    constraint = models.ForeignKey(GeoConstraint, on_delete=models.CASCADE)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, blank=True, null=True)
    group = models.ForeignKey(
        AuthGroup, on_delete=models.CASCADE, blank=True, null=True)
    anonymoususer = models.BooleanField(blank=True, null=True, default=False)
    rule = models.TextField(
        _("SQL WHERE clause for the constraint layer"), max_length=255)

    @property
    def active(self):
        """The rule is active if the constraint is"""

        return self.constraint.active

    def __str__(self):
        return "%s, %s: %s" % (self.constraint, self.user_or_group, self.rule)

    class Meta:
        managed = True
        verbose_name = _('Geoconstraint rule')
        verbose_name_plural = _('Geoconstraint rules')
        unique_together = (('constraint', 'user', 'rule'),
                           ('constraint', 'group', 'rule'))
        app_label = 'qdjango'

    @property
    def user_or_group(self):
        """Returns the user or the group for this constraint"""

        if self.user:
            return self.user
        return self.group

    def clean(self):
        """Make sure either a group or a user are defined and that the SQL query runs without errors"""

        if self.group and self.user:
            raise ValidationError(
                _('You cannot define a user and a group at the same time'))

        if not self.group and not self.user:
            raise ValidationError(
                _('You must define a user OR a group'))

        sql_valid, ex = self.validate_sql()
        if not sql_valid:
            raise ValidationError(
                _('There is an error in the SQL rule where condition: %s' % ex))

    def get_constraint_geometry(self):
        """Returns the geometry from the constraint layer and rule

        :return: the constraint geometry and the number of matched records
        :rtype: tuple( MultiPolygon, integer)
        """

        constraint_layer = get_qgis_layer(self.constraint.constraint_layer)
        layer = get_qgis_layer(self.constraint.layer)

        # Get the geometries from constraint layer and rule
        qgis_feature_request = QgsFeatureRequest()
        qgis_feature_request.combineFilterExpression(self.rule)

        features = get_qgis_features(constraint_layer, qgis_feature_request, exclude_fields='__all__')

        if not features:
            return '', 0

        geometry = QgsMultiPolygon()

        for feature in features:
            geom = feature.geometry()
            if geom.isMultipart():
                geom = [g for g in geom.constGet()]
            else:
                geom = [geom.constGet()]

            i = 0
            for g in geom:
                geometry.insertGeometry(g.clone(), 0)
                i += 1

        # Now, transform into a GEOS geometry
        if constraint_layer.crs() != layer.crs():
            ct = QgsCoordinateTransform(QgsCoordinateReferenceSystem(constraint_layer.crs()), QgsCoordinateReferenceSystem(layer.crs()), QgsCoordinateTransformContext())
            geometry.transform(ct)

        constraint_geometry = MultiPolygon.from_ewkt('SRID=%s;' % layer.crs().postgisSrid() + geometry.asWkt())

        return constraint_geometry, constraint_geometry.num_geom

    def get_qgis_expression(self):
        """Returns the QGIS expression text for this rule
        """

        constraint_geometry, __ = self.get_constraint_geometry()

        expression = ''

        if constraint_geometry:
            spatial_predicate = getattr(
            settings, 'EDITING_CONSTRAINT_SPATIAL_PREDICATE', 'contains')
            return f"{spatial_predicate}(geom_from_wkt( '{constraint_geometry.wkt}' ), $geometry )"


    def validate_sql(self):
        """Checks if the rule can be executed without errors

        :return: (True, None) if rule has valid SQL, (False, ValidationError) if it is not valid
        :rtype: tuple (bool, ValidationError)
        """

        try:
            req = QgsFeatureRequest()
            req.setFilterExpression(self.get_qgis_expression())
            expression = req.filterExpression()
            if expression is None:
                return False, QgsExpression(self.rule).parserErrorString()
            if not expression.isValid():
                return False, expression.parserErrorString()
        except Exception as ex:
            logger.debug('Validate SQL failed: %s' % ex)
            return False, ex
        return True, None

    @classmethod
    def get_context(cls, context='v'):
        """Build kwargs params for constraint

        :param context: SingleLayerConstraint context 'v (view)' 'e (editing)' 've (view + editing)'
        :type context: str
        :return: kwargs dict
        :rtype: dict
        """

        kwargs = {}
        if context == 'v':
            kwargs['for_view'] = True
        elif context == 'e':
            kwargs['for_editing'] = True
        elif context == 've':
            kwargs['for_view'] = True
            kwargs['for_editing'] = True
        else:
            kwargs['for_view'] = True

        return kwargs

    @classmethod
    def get_constraints_for_user(cls, user, layer):
        """Fetch the constraints for a given user and editing layer

        :param user: the user
        :type user: User
        :param layer: the editing layer
        :type layer: Layer
        :return: a list of GeoConstraintRule
        :rtype: QuerySet
        """

        # not filter if user is Anonymoususer
        if user.is_anonymous:
            return []

        constraints = GeoConstraint.objects.filter(layer=layer)
        if not constraints:
            return []
        user_groups = user.groups.all()
        if user_groups.count():
            return cls.objects.filter(Q(constraint__in=constraints), Q(user=user) | Q(group__in=user_groups))
        else:
            return cls.objects.filter(constraint__in=constraints, user=user)

    @classmethod
    def get_constraints_for_anonymoususer(cls, layer, context='v'):
        """Fetch the constraints for anonymoususer

        :param layer: the editing layer
        :type layer: Layer
        :return: a list of GeoConstraintRule
        :rtype: QuerySet
        """

        constraints = GeoConstraint.objects.filter(
            layer=layer, active=True, **cls.get_context(context))
        if not constraints:
            return []

        return cls.objects.filter(anonymoususer=True)

    @classmethod
    def get_active_constraints_for_user(cls, user, layer, context='v'):
        """Fetch the active constraints for a given user and editing layer

        :param user: the user
        :type user: User
        :param layer: the editing layer
        :type layer: Layer
        :param context: SingleLayerConstraint context 'v (view)' 'e (editing)' 've (view + editing)'
        :type context: str
        :return: a list of GeoConstraintRule
        :rtype: QuerySet
        """

        # not filter if user is Anonymoususer
        if user.is_anonymous:
            return cls.get_constraints_for_anonymoususer(layer=layer, context=context)

        constraints = GeoConstraint.objects.filter(
            layer=layer, active=True, **cls.get_context(context))
        if not constraints:
            return []
        user_groups = user.groups.all()
        if user_groups.count():
            return cls.objects.filter(Q(constraint__in=constraints), Q(user=user) | Q(group__in=user_groups))
        else:
            return cls.objects.filter(constraint__in=constraints, user=user)

    @classmethod
    def get_rule_definition_for_user(cls, user, layer):
        """Fetch the active constraints rule QGIS expression for a given user and layer

        :param user: the user
        :type user: User
        :param layer: the layer
        :type layer: Layer
        :return: a list of GeoConstraintRule
        :rtype: QuerySet
        """

        rules = cls.get_active_constraints_for_user(user, layer)

        subset_strings = []
        for rule in rules:
            subset_strings.append(rule.get_qgis_expression())

        subset_string = ' AND '.join(subset_strings)
        logger.debug("Returning rule definition for user %s and layer %s: %s" % (
            user, layer.pk, subset_string))
        return subset_string

    @classmethod
    def get_max_extent_on_project_for_user(cls, project, user):
        """
        Calculate for a user in a qdjango project instance the max cumulative extent of features
        derived from geoconstraint rules.

        :param project: qdjango.Project instance
        :type project: Django model
        :param user: The Request user
        :type user: Django model
        :return: A list of minx, miny, maxx, maxy
        :rtype: list
        """

        # For every project layer get user roles
        xmin = None
        ymin = None
        xmax = None
        ymax = None
        for layer in project.layer_set.all():
            rules = cls.get_active_constraints_for_user(user, layer)
            if rules:
                for rule in rules:

                    # Check if Geoconstraint has `autozoom` activated
                    if not rule.constraint.autozoom:
                        continue

                    # Check if CRS layer != Project CRS
                    if project.group.srid.auth_srid == layer.srid:
                        rect = QgsRectangle.fromWkt(rule.get_constraint_geometry()[0].envelope.wkt)
                    else:
                        geom = QgsMultiPolygon.fromWkt(rule.get_constraint_geometry()[0].wkt)
                        ct = QgsCoordinateTransform(QgsCoordinateReferenceSystem(f'EPSG:{layer.srid}'),
                                                    QgsCoordinateReferenceSystem(
                                                        f'EPSG:{project.group.srid.auth_srid}'),
                                                    QgsCoordinateTransformContext())
                        geom.transform(ct)
                        rect = geom.caolculateBoundingBox()

                    if xmin is None:
                        xmin = rect.xMinimum()
                    else:
                        if rect.xMinimum() < xmin:
                            xmin = rect.xMinimum()

                    if ymin is None:
                        ymin = rect.yMinimum()
                    else:
                        if rect.yMinimum() < ymin:
                            ymin = rect.yMinimum()

                    if xmax is None:
                        xmax = rect.xMaximum()
                    else:
                        if rect.xMaximum() > xmax:
                            xmax = rect.xMaximum()

                    if ymax is None:
                        ymax = rect.yMaximum()
                    else:
                        if rect.yMaximum() > ymax:
                            ymax = rect.yMaximum()

        if xmin and ymin and xmax and ymax:
            return [xmin, ymin, xmax, ymax]
        else:
            return None



