# coding=utf-8
""""Constraints for single layers based on a rule and

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-15'
__copyright__ = 'Copyright 2020, Gis3W'

import logging
from django.conf import settings
from django.contrib.auth.models import Group as AuthGroup, User
from django.core.exceptions import ValidationError
from django.db import connection, models, transaction
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from qgis.core import (
    QgsExpressionContext,
    QgsFeatureRequest,
    QgsExpression,
    QgsExpressionContextUtils,
    Qgis,
)

from qdjango.models import Layer

logger = logging.getLogger(__name__)

# Determine if we are using an old and bugged version of QGIS
IS_QGIS_3_10 = Qgis.QGIS_VERSION.startswith('3.10')


class SingleLayerConstraint(models.Model):
    """Main constraint class for a single layer.
    Stores the layer that is the target of a constraint and the constraint active state.
    """

    active = models.BooleanField(default=True)
    layer = models.ForeignKey(
        Layer, on_delete=models.CASCADE, related_name='constrainted_layer')
    name = models.CharField(_('Name'), max_length=255)
    description = models.TextField(_('Description'), null=True, blank=True)

    for_view = models.BooleanField(_('Active for visualization'), default=True, null=True,
                                   help_text=_(
                                       'Active this constraint for users have viewing grant on layer/project'))
    for_editing = models.BooleanField(_('Active for editing'), default=False, null=True,
                                   help_text=_(
                                       'Active this constraint for users have editing grant on layer/project'))

    @property
    def qgs_layer_id(self):
        """Return the QGIS layer id for the constrainted layer"""

        return self.layer.qgs_layer_id

    @property
    def layer_name(self):
        """Return the QGIS layer name for the constrainted layer"""

        return self.layer.name

    @property
    def rule_count(self):
        """Return the rules count for constrainted layer"""

        return self.constraintexpressionrule_set.count() + self.constraintsubsetstringrule_set.count()

    @property
    def subset_rule_count(self):
        """Return the subset rules count for constrainted layer"""

        return self.constraintsubsetstringrule_set.count()

    @property
    def expression_rule_count(self):
        """Return the subset rules count for constrainted layer"""

        return self.constraintexpressionrule_set.count()

    def clean(self):

        # add for_view and for_editing cleaning
        if not self.for_view and not self.for_editing:
            raise ValidationError(_('Almonst one of fields for_view and for_editing it must be True'))

    def __str__(self):
        return "%s (%s)" % (self.layer, self.active)

    class Meta:
        managed = True
        verbose_name = _('Layer constraint')
        verbose_name_plural = _('Layer constraints')
        app_label = 'qdjango'


class CommonConstraintRule(models.Model):
    """Base class for constraint rules"""

    constraint = models.ForeignKey(
        SingleLayerConstraint, on_delete=models.CASCADE)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, blank=True, null=True)
    group = models.ForeignKey(
        AuthGroup, on_delete=models.CASCADE, blank=True, null=True)
    anonymoususer = models.BooleanField(blank=True, null=True, default=False)
    rule = models.TextField(_("Rule definition"), max_length=1024, help_text=_(
        "Definition of the rule, either an SQL WHERE condition or a QgsExpression definition depending on the rule type"))

    class Meta:
        abstract = True
        managed = True
        unique_together = (('constraint', 'user', 'rule'),
                           ('constraint', 'group', 'rule'))
        app_label = 'qdjango'

    @property
    def active(self):
        """The rule is active if the constraint is"""

        return self.constraint.active

    def __str__(self):
        return "%s, %s: %s" % (self.constraint, self.user_or_group, self.rule)

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

    @classmethod
    def get_constraints_for_user(cls, user, layer):
        """Fetch the constraint rules for a given user and layer

        :param user: the user
        :type user: User
        :param layer: the layer
        :type layer: Layer
        :return: a list of ConstraintRule
        :rtype: QuerySet
        """

        # not filter if user is Anonymoususer
        if user.is_anonymous:
            return []

        constraints = SingleLayerConstraint.objects.filter(layer=layer)
        if not constraints:
            return []
        user_groups = user.groups.all()
        if user_groups.count():
            return cls.objects.filter(Q(constraint__in=constraints), Q(user=user) | Q(group__in=user_groups))
        else:
            return cls.objects.filter(constraint__in=constraints, user=user)

    @classmethod
    def get_active_constraints_for_user(cls, user, layer):
        """Fetch the active constraints for a given user and layer

        :param user: the user
        :type user: User
        :param layer: the layer
        :type layer: Layer
        :return: a list of ConstraintRule
        :rtype: QuerySet
        """

        # not filter if user is Anonymoususer
        if user.is_anonymous:
            return []

        constraints = SingleLayerConstraint.objects.filter(
            layer=layer, active=True)
        if not constraints:
            return []
        user_groups = user.groups.all()
        if user_groups.count():
            return cls.objects.filter(Q(constraint__in=constraints), Q(user=user) | Q(group__in=user_groups))
        else:
            return cls.objects.filter(constraint__in=constraints, user=user)

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
    def get_constraints_for_anonymoususer(cls, layer_id, context='v'):
        """Fetch the constraints for anonymou suser

        :param layer: the editing layer
        :type layer_: Layer pk
        :return: a list of SigleLayerContraint
        :rtype: QuerySet
        """

        constraints = SingleLayerConstraint.objects.filter(
            layer_id=layer_id, active=True, **cls.get_context(context))
        if not constraints:
            return []

        return cls.objects.filter(anonymoususer=True, constraint__in=constraints)

    @classmethod
    def get_rule_definition_for_user(cls, user, layer_id, context='v'):
        """Fetch the active constraints for a given user and qdjango layer pk.

        :param user: the user
        :type user: User
        :param layer_id: qdjango Layer pk
        :type layer_id: str
        :param context: SingleLayerConstraint context 'v (view)' 'e (editing)' 've (view + editing)'
        :type context: str
        :return: the subset string
        :rtype: str
        """

        # not filter if user is Anonymoususer
        if user.is_anonymous:
            rules = cls.get_constraints_for_anonymoususer(layer_id=layer_id, context=context)
        else:
            try:
                constraints = SingleLayerConstraint.objects.filter(
                    layer=Layer.objects.get(pk=layer_id), active=True, **cls.get_context(context))
            except Layer.DoesNotExist as ex:
                logger.error(
                    "A Layer object with qdjango layer id %s was not found: skipping constraints!" % layer_id)
                return ""

            if not constraints:
                return ""

            user_groups = user.groups.all()
            if user_groups.count():
                rules = cls.objects.filter(Q(constraint__in=constraints), Q(
                    user=user) | Q(group__in=user_groups))
            else:
                rules = cls.objects.filter(constraint__in=constraints, user=user)

        subset_strings = []
        for rule in rules:
            subset_strings.append("(%s)" % rule.rule)

        subset_string = ' AND '.join(subset_strings)
        logger.debug("Returning rule definition for user %s and layer %s: %s" % (
            user, layer_id, subset_string))
        return subset_string


class ConstraintSubsetStringRule(CommonConstraintRule):
    """Constraint subset string rule class: links the constraint with a user or a group and
    defines the constraint subset string SQL rule"""

    class Meta(CommonConstraintRule.Meta):
        verbose_name = _('Constraint subset string rule')
        verbose_name_plural = _('Constraint subset string rules')

    def validate_sql(self):
        """Checks if the rule can be executed without errors

        :raises ValidationError: error
        :return: (True, None) if rule has valid SQL, (False, ValidationError) if it is not valid
        :rtype: tuple (bool, ValidationError)
        """

        try:
            project = self.constraint.layer.project.qgis_project
            if project is None:
                raise ValidationError(
                    "QGIS project not found: %s" % self.constraint.layer.project.qgis_file.path)
            layer = project.mapLayers(
            )[self.constraint.layer.qgs_layer_id].clone()
            original_subset_string = layer.subsetString()
            if original_subset_string:
                subset_string = "(%s) AND (%s)" % (
                    original_subset_string, self.rule)
            else:
                subset_string = self.rule
            if not layer.setSubsetString(subset_string):
                raise ValidationError("Could not set the subset string for layer %s: %s" % (
                    self.constraint.layer, subset_string))
            is_valid = layer.isValid()
            if not is_valid:
                raise ValidationError("QGIS layer %s is not valid after setting the new constraint: %s" % (
                    self.constraint.layer, subset_string))

            # If we are using the bugged version, we need to check if the subset
            # string was really changed because the setSubsetString call above
            # returns True in any case
            if IS_QGIS_3_10 and subset_string != layer.subsetString():
                raise ValidationError("Could not set the subset string for layer %s: %s" % (
                    self.constraint.layer, subset_string))

        except Exception as ex:
            logger.debug('Validate SQL failed: %s' % ex)
            return False, ex
        return True, None


class ConstraintExpressionRule(CommonConstraintRule):
    """Constraint expression rule class: links the constraint with a user or a group and
    defines the constraint string QgsExpression rule"""

    class Meta(CommonConstraintRule.Meta):
        verbose_name = _('Constraint expression rule')
        verbose_name_plural = _('Constraint expression rules')

    def validate_sql(self):
        """Checks if the rule can be executed without errors

        :raises ValidationError: error
        :return: (True, None) if rule has valid SQL, (False, ValidationError) if it is not valid
        :rtype: tuple (bool, ValidationError)
        """

        try:
            req = QgsFeatureRequest()
            req.setFilterExpression(self.rule)
            expression = req.filterExpression()
            if expression is None:
                return False, QgsExpression(self.rule).parserErrorString()
            if not expression.isValid():
                return False, expression.parserErrorString()
            project = self.constraint.layer.project.qgis_project
            if project is None:
                return False, 'QGIS project was not found!'
            try:
                layer = project.mapLayers()[self.constraint.layer.qgs_layer_id]
            except KeyError:
                return False, 'QGIS layer id not found in the project!'
            ctx = QgsExpressionContext()
            ctx.appendScope(QgsExpressionContextUtils.layerScope(layer))
            if not expression.prepare(ctx):
                return False, expression.parserErrorString() + '\n' + expression.evalErrorString()
        except Exception as ex:
            logger.debug('Validate SQL failed: %s' % ex)
            return False, ex
        return True, None
