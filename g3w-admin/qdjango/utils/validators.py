# coding=utf-8
""""QGIS project and feature related validators and checkers for errors and QGIS constraints.

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

import os
import re

from django.utils.translation import ugettext
from django.utils.translation import ugettext_lazy as _
from osgeo import gdal

from core.utils.data import isXML
from qdjango.models import Layer

from .exceptions import (
    QgisProjectException,
    QgisProjectLayerException
)

from qgis.core import (
    QgsWkbTypes,
    QgsFieldConstraints,
    QgsFeatureRequest,
    QgsExpression,
    QgsExpressionContextUtils
)

from qgis.PyQt.QtCore import QVariant, Qt


def feature_validator(feature, layer):
    """Validate a QGIS feature by checking QGIS fields constraints

    The logic here is to:
    - if geometry is not None check if geometry type matches the layer type
    - loop through the fields and check for constraints:
        - NOT NULL, skip the next checks if this fails
        - UNIQUE
        - EXPRESSION (QgsExpression configured in the form)

    Note: only hard constraints are checked!

    :param feature: QGIS feature
    :type feature: QgsFeature
    :param layer: QGIS layer
    :type layer: QgsVectorLayer
    :return: a dictionary of errors for each field + geometry
    :rtype: dict
    """

    errors = dict()
    geometry = feature.geometry()

    data_provider = layer.dataProvider()

    def _has_default_value(field_index, field):
        return (
            # Provider level
            data_provider.defaultValueClause(field_index) or
            data_provider.defaultValue(field_index) or
            field.defaultValueDefinition().isValid()
        )

    # Check geometry type
    if not geometry.isNull() and geometry.wkbType() != layer.wkbType():
        errors['geometry'] = _('Feature geometry type %s does not match layer type: %s') % (
            QgsWkbTypes.displayString(geometry.wkbType()), QgsWkbTypes.displayString(layer.wkbType()))

    def _set_error(field_name, error):
        if not field_name in errors:
            errors[field_name] = []
        errors[field_name].append(error)

    def _check_value_type(field, value):
        return QVariant(value).convert(field.type())

    # Check fields "hard" constraints
    for field_index in range(layer.fields().count()):

        field = layer.fields().field(field_index)

        # Check not null first, if it fails skip other tests (unique and expression)
        value = feature.attribute(field.name())
        # If there is a default value we assume it's not NULL (we cannot really know at this point
        # what will be the result of the default value clause evaluation, it might even be provider-side)
        if (value is None or value == '') and not _has_default_value(field_index, field):
            not_null = (field.constraints().constraintOrigin(
                QgsFieldConstraints.ConstraintNotNull) != QgsFieldConstraints.ConstraintOriginNotSet
                and field.constraints().constraintStrength(QgsFieldConstraints.ConstraintNotNull)
                == QgsFieldConstraints.ConstraintStrengthHard)
            if not_null:
                _set_error(field.name(), _(
                    'Field value must be NOT NULL'))
                continue

        value = feature.attribute(field_index)

        # Skip if NULL, not sure if we want to continue in this case but it seems pointless
        # to check for unique or type compatibility on NULLs
        if value is not None:

            if not _check_value_type(field, value):
                _set_error(field.name(), _(
                    'Field value cannot be converted to %s') % QVariant.typeToName(field.type()))

            unique = (field.constraints().constraintOrigin(
                QgsFieldConstraints.ConstraintUnique) != QgsFieldConstraints.ConstraintOriginNotSet and
                field.constraints().constraintStrength(QgsFieldConstraints.ConstraintUnique)
                == QgsFieldConstraints.ConstraintStrengthHard)

            if unique:
                # Search for features, excluding self if it's an update
                request = QgsFeatureRequest()
                request.setNoAttributes()
                request.setFlags(QgsFeatureRequest.NoGeometry)
                request.setLimit(2)
                if field.isNumeric():
                    request.setFilterExpression('"%s" = %s' % (
                        field.name().replace('"', '\\"'), value))
                elif field.type() == QVariant.String:
                    request.setFilterExpression('"%s" = \'%s\'' % (
                        field.name().replace('"', '\\"'), value.replace("'", "\\'")))
                elif field.type() == QVariant.Date or field.type() == QVariant.DateTime:
                    request.setFilterExpression('"%s" = \'%s\'' % (
                        field.name().replace('"', '\\"'), value.toString(Qt.ISODate)))
                elif field.type() == QVariant.Bool:  # This does not make any sense, but still
                    request.setFilterExpression('"%s" = %s' % (
                        field.name().replace('"', '\\"'), 'true' if value else 'false'))
                else:  # All the other formats: let's convert to string and hope for the best
                    request.setFilterExpression('"%s" = \'%s\'' % (
                        field.name().replace('"', '\\"'), value.toString()))

                # Exclude same feature by id
                found = [f.id() for f in layer.getFeatures(
                    request) if f.id() != feature.id()]
                if len(found) > 0:
                    _set_error(field.name(), _(
                        'Field value must be UNIQUE'))

        # Check for expressions, even in case of NULL because expressions may want to check for combined
        # conditions on multiple fields
        expression = (field.constraints().constraintOrigin(
            QgsFieldConstraints.ConstraintExpression) != QgsFieldConstraints.ConstraintOriginNotSet and field.constraints().constraintStrength(QgsFieldConstraints.ConstraintExpression)
            == QgsFieldConstraints.ConstraintStrengthHard)
        if expression:
            constraints = field.constraints()
            expression = constraints.constraintExpression()
            description = constraints.constraintDescription()
            value = feature.attribute(field_index)
            exp = QgsExpression(expression)
            context = QgsExpressionContextUtils.createFeatureBasedContext(
                feature, layer.fields())
            context.appendScopes(
                QgsExpressionContextUtils.globalProjectLayerScopes(layer))
            if not bool(exp.evaluate(context)):
                if not description:
                    description = _('Expression check violation')
                _set_error(field.name(), _("%s Expression: %s") %
                           (description, expression))

    return errors


class QgisValidator(object):
    """
    Interface for Qgis object validators
    """

    def clean(self):
        pass


class QgisProjectValidator(QgisValidator):
    """
    A simple qgis project validator call clean method
    """

    def __init__(self, qgisProject):
        self.qgisProject = qgisProject

    def clean(self):
        pass


class IsGroupCompatibleValidator(QgisProjectValidator):
    """
    Check il project is compatible with own group
    """

    def clean(self):
        if self.qgisProject.group.srid.srid != self.qgisProject.srid:
            raise QgisProjectException(_('Project SRID (%s) and group SRID (%s) must be the same') % (
                self.qgisProject.srid, self.qgisProject.group.srid.srid))


class ProjectExists(QgisProjectValidator):
    """
    Check if project exists in database
    """

    def clean(self):
        from qdjango.models import Project
        if Project.objects.filter(title=self.qgisProject.title).exists():
            raise QgisProjectException(
                _('A project with the same title already exists'))


class ProjectTitleExists(QgisProjectValidator):
    """
    Check if project title exists
    """

    def clean(self):
        if not self.qgisProject.title:
            if self.qgisProject.qgisProjectFile.name:
                self.qgisProject.title = self.qgisProject.qgisProjectFile.name
            else:
                raise QgisProjectException(_('Title project not empty'))


class UniqueLayername(QgisProjectValidator):
    """
    Check if laeryname is unique inside a project
    """

    def clean(self):
        layers = []
        for layer in self.qgisProject.layers:
            if layer.name in layers:
                raise QgisProjectException(
                    _('More than one layer with same name/shortname: {}'.format(layer.name)))
            layers.append(layer.name)


class CheckMaxExtent(QgisProjectValidator):
    """
    Check il WMSExtent is correct
    """

    def clean(self):
        max_extent = self.qgisProject.maxExtent

        if max_extent:

            # cast coord to float
            for c in ['xmin', 'xmax', 'ymin', 'ymax']:
                max_extent[c] = float(max_extent[c])

            # check is a cordinate il None or empty
            wrong_coord = list()
            for coord, value in list(max_extent.items()):
                if not value:
                    wrong_coord.append(coord)

            if len(wrong_coord) > 0:
                raise QgisProjectException(
                    _('Check WMS start extent project property: {} didn\'t set'.format(','.join(wrong_coord))))

            # check calue are correct inside angles coordinates
            err_msg_x = err_msg_y = ''
            if max_extent['xmax'] < max_extent['xmin']:
                err_msg_x = _('xmax smaller then xmin ')
            if max_extent['ymax'] < max_extent['ymin']:
                err_msg_y = _('ymax smaller then ymin ')

            if err_msg_x or err_msg_y:
                raise QgisProjectException(
                    'Check WMS start extent project property: {}{}'.format(err_msg_x, err_msg_y))


class QgisProjectLayerValidator(QgisValidator):
    """
    A simple qgis project layer validator call clean method
    """

    def __init__(self, qgisProjectLayer):
        self.qgisProjectLayer = qgisProjectLayer

    def clean(self):
        pass


class DatasourceExists(QgisProjectLayerValidator):
    """
    Check if layer datasource exists on server
    """

    def clean(self):
        if self.qgisProjectLayer.layerType in [Layer.TYPES.gdal, Layer.TYPES.ogr, Layer.TYPES.raster]:
            if self.qgisProjectLayer.layerType != Layer.TYPES.gdal or not isXML(self.qgisProjectLayer.datasource):
                if self.qgisProjectLayer.datasource.startswith("PG:"):

                    # try to open postgis raster with gdal
                    raster = gdal.Open(self.qgisProjectLayer.datasource)
                    if raster is None:
                        err = ugettext('Cannot connect to Postgis raster layer {} '.format(
                            self.qgisProjectLayer.name))
                        raise QgisProjectLayerException(err)

                else:
                    if not os.path.exists(self.qgisProjectLayer.datasource.split('|')[0]):
                        err = ugettext('Missing data file for layer {} '.format(
                            self.qgisProjectLayer.name))
                        err += ugettext('which should be located at {}'.format(
                            self.qgisProjectLayer.datasource))
                        raise QgisProjectLayerException(err)


class ColumnName(QgisProjectLayerValidator):
    """
    Check column data name: no whitespace, no special chars.
    """

    def clean(self):
        if self.qgisProjectLayer.layerType in [Layer.TYPES.ogr, Layer.TYPES.postgres, Layer.TYPES.spatialite]:
            columns_err = []
            for column in self.qgisProjectLayer.columns:
                # search
                # rex = '[^A-Za-z0-9]+'
                rex = '[;:,%@$^&*!#()\[\]\{\}\\n\\r\\s]+'
                if re.search(rex, column['name']):
                    columns_err.append(column['name'])
            if columns_err:
                err = ugettext('The follow fields name of layer {} contains '
                               'white spaces and/or special characters: {}')\
                    .format(self.qgisProjectLayer.name, ', '.join(columns_err))
                err += ugettext('Please use \'Alias\' fields in QGIS project')
                raise QgisProjectLayerException(err)
