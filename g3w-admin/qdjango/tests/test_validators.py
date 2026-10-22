# coding=utf-8
""""Tests for qdjango validators module

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-05-15'
__copyright__ = 'Copyright 2020, Gis3w'


import logging
import os
import shutil
from qgis.PyQt.QtCore import QTemporaryDir, QVariant
from qgis.core import QgsFeature, QgsProject, QgsGeometry, Qgis

from qdjango.utils.validators import feature_validator

from .base import QdjangoTestBase

logger = logging.getLogger(__name__)


class TestFeatureValidator(QdjangoTestBase):
    """Test feature validator

    table definition

        CREATE TABLE `validator_project_test` (
            `fid`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            `geometry`	POINT,
            `text_nullable`	TEXT,
            `text_not_nullable`	TEXT NOT NULL,
            `text_unique`	TEXT UNIQUE,
            `integer_nullable`	MEDIUMINT,
            `integer_not_nullable`	MEDIUMINT NOT NULL,
            `integer_unique`	MEDIUMINT UNIQUE,
            `integer_not_nullable_default`	INTEGER NOT NULL DEFAULT 1234,
            `long_nullable`	INTEGER,
            `long_not_nullable`	INTEGER NOT NULL,
            `long_unique`	INTEGER UNIQUE,
            `float_nullable`	REAL,
            `float_not_nullable`	REAL NOT NULL,
            `float_unique`	REAL UNIQUE,
            `bool_nullable`	BOOLEAN,
            `bool_not_nullable`	BOOLEAN NOT NULL,
            `date_nullable`	DATE,
            `date_not_nullable`	DATE NOT NULL,
            `date_unique`	DATE UNIQUE,
            `datetime_nullable`	DATETIME,
            `datetime_not_nullable`	DATETIME NOT NULL,
            `datetime_unique`	DATETIME UNIQUE,
            `integer_check`	integer CHECK(integer_check > 0 and integer_check <= 123)
        );

      The test table contains a single record with 123 value for all fields (except bool)
      date/times are 1000-02-03 00:00:00

      The first layer in the project "validator_project_test.qgs" is named ""validator_project_test"
      and it does not set any additional rule at the project level.

      In the test project there are cloned layers with project level constraints sets to the "nullable" fields:

      "validator_project_test_not_null"
      "validator_project_test_unique"
      "validator_project_test_expression"

      pointing to the same data source
      where unique, not null and value checks and constraints have been set in the
      project itself for all *_nullable fields.

    """

    def setUp(self):
        super().setUp()

        self.dir = QTemporaryDir()
        shutil.copytree(os.path.join(os.path.dirname(
            __file__), 'data'), os.path.join(self.dir.path(), 'projects'))
        self.project = QgsProject()
        assert self.project.read(os.path.join(
            self.dir.path(), 'projects', 'validator_project_test_328.qgs'))
        self.validator_project_test = self.project.mapLayersByName(
            'validator_project_test')[0]
        self.validator_project_test_not_null = self.project.mapLayersByName(
            'validator_project_test_not_null')[0]
        self.validator_project_test_unique = self.project.mapLayersByName(
            'validator_project_test_unique')[0]
        self.validator_project_test_defaults = self.project.mapLayersByName(
            'validator_project_test_defaults')[0]
        self.validator_project_test_expressions = self.project.mapLayersByName(
            'validator_project_test_expressions')[0]

        self.not_nullable_fields = set(
            [name for name in self.validator_project_test.fields().names() if '_not_nullable' in name and name != 'integer_not_nullable_default'])
        self.nullable_fields = set(
            [name for name in self.validator_project_test.fields().names() if '_nullable' in name and '_not_nullable' not in name])
        self.unique_fields = set(('fid',)).union(
            [name for name in self.validator_project_test.fields().names() if '_unique' in name])
        self.unconstrained_fields = set([name for name in self.validator_project_test.fields(
        ).names() if name not in self.not_nullable_fields.union(self.unique_fields)])

    def tearDown(self):
        """Delete projects and layers"""

        super().tearDown()
        del(self.validator_project_test_expressions)
        del(self.validator_project_test_unique)
        del(self.validator_project_test_defaults)
        del(self.validator_project_test_not_null)
        del(self.validator_project_test)
        del(self.project)


    def _feature_factory(self, attrs={}, geom='POINT(9, 45)'):
        """Creates a QgsFeature for the test"""

        feature = QgsFeature(
            self.project.mapLayersByName('validator_project_test')[0].fields())
        for attr_name, attr_value in attrs.items():
            feature[attr_name] = attr_value
        geometry = QgsGeometry.fromWkt(geom)
        feature.setGeometry(geometry)
        return feature

    def test_geometry(self):
        """Test geometry type matches"""

        feature = self._feature_factory()
        errors = feature_validator(feature, self.validator_project_test)
        self.assertFalse('geometry' in errors)

        feature = self._feature_factory({}, 'NULL')
        errors = feature_validator(feature, self.validator_project_test)
        self.assertFalse('geometry' in errors)

        feature = self._feature_factory({}, 'LINESTRING(9 45, 10 46)')
        errors = feature_validator(feature, self.validator_project_test)
        self.assertTrue('geometry' in errors, errors)

    def test_not_null(self):
        """Test not null DB level and project level constraints"""

        feature = self._feature_factory()
        errors = feature_validator(feature, self.validator_project_test)
        self.assertEqual(set(errors.keys()), self.not_nullable_fields)

        feature = self._feature_factory()
        errors = feature_validator(
            feature, self.validator_project_test_not_null)
        self.assertEqual(set(
            errors.keys()), self.not_nullable_fields.union(self.nullable_fields))

        # NOT NULL with defaults
        feature = self._feature_factory()
        errors = feature_validator(
            feature, self.validator_project_test_defaults)
        self.assertEqual(set(
            errors.keys()), set())

    def test_unique(self):
        """Test unique project level constraints"""

        # Note: in QGIS 3.10 DB-level unique constraints are not supported by OGR and spatialite providers
        #       in QGIS 3.16 they are supported

        # Nothing is set, only return NOT NULL errors
        feature = self._feature_factory(
            {}, 'point( 9 45 )')
        errors = feature_validator(
            feature, self.validator_project_test_unique)
        self.assertEqual(set(errors.keys()), self.not_nullable_fields)

        # Clone the existing feature
        feature = self.validator_project_test.getFeature(1)
        # Null the id to simulate a new feature added
        feature.setId(0)
        feature.setAttribute(0, 0)  # fid
        errors = feature_validator(
            feature, self.validator_project_test_unique)

        # 3.16 also supports DB-level unique on OGR layers, 3.10 does not
        if Qgis.QGIS_VERSION_INT < 31600:
            self.assertEqual(set(errors.keys()),
                self.nullable_fields.difference(('bool_nullable', )))
        else:
            self.assertEqual(set(errors.keys()),
                         self.nullable_fields.union(self.unique_fields).difference(('bool_nullable', 'fid')))
        for k in errors.keys():
            self.assertEqual(errors[k], ['Field value must be UNIQUE'])

    def test_expression(self):
        """Test project level expression constraints"""
        feature = self._feature_factory(
            {
                # To avoid other errors
                'text_not_nullable': 'a text',
                'integer_not_nullable': 12345,
                'long_not_nullable': 12345,
                'float_not_nullable': 12345,
                'bool_not_nullable': True,
                'date_not_nullable': '2020-02-01',
                'datetime_not_nullable': '2020-02-01 00:00:00',
                # The real expression test, check is != 123 or 1000-02-03
                'text_nullable': '124',
                'integer_nullable': 124,
                'long_nullable': 124,
                'float_nullable': 124,
                'date_nullable': '1000-02-04',
                'datetime_nullable': '1000-02-04 00:00:00'},
            'point( 9 45 )')
        errors = feature_validator(
            feature, self.validator_project_test_expressions)
        self.assertEqual(errors, {})

        feature.setAttribute('text_nullable', '123')
        errors = feature_validator(
            feature, self.validator_project_test_expressions)
        self.assertEqual(errors, {
            'text_nullable': ["My constraint Expression: text_nullable != '123'"]
        })

        # Clone the existing feature
        feature = self.validator_project_test.getFeature(1)
        # Null the id to simulate a new feature added
        feature.setId(0)
        feature.setAttribute(0, 0)  # fid
        errors = feature_validator(
            feature, self.validator_project_test_expressions)
        self.assertEqual(errors['text_nullable'][0],
                         "My constraint Expression: text_nullable != '123'")
        self.assertEqual(errors['integer_nullable'][0],
                         "Expression check violation Expression: integer_nullable != 123")
        self.assertEqual(errors['long_nullable'][0],
                         "Expression check violation Expression: long_nullable != 123")
        self.assertEqual(errors['float_nullable'][0],
                         "Expression check violation Expression: float_nullable != 123")
        self.assertEqual(errors['date_nullable'][0],
                         "Expression check violation Expression: date_nullable != '1000-02-03'")
        self.assertEqual(errors['datetime_nullable'][0],
                         "Expression check violation Expression: datetime_nullable != to_datetime('1000-02-03 00:00:00')")

    def test_value_types(self):
        """Test value type compatibility"""

        feature = self._feature_factory(
            {
                'text_not_nullable': 123,
                'integer_not_nullable': 'not an int',
                'long_not_nullable': 'not a number',
                'float_not_nullable': 'not a number',
                # Note: this is actually convertible to bool
                'bool_not_nullable': 'not a boolean',
                'date_not_nullable': 'not a date',
                'datetime_not_nullable': 'not a datetime',
            },
            'point( 9 45 )')
        errors = feature_validator(
            feature, self.validator_project_test)

        self.assertEqual(errors, {'integer_not_nullable': ["Field value 'not an int' cannot be converted to int"],
                                  'long_not_nullable': ["Field value 'not a number' cannot be converted to qlonglong"],
                                  'float_not_nullable': ["Field value 'not a number' cannot be converted to double"],
                                  'date_not_nullable': ["Field value 'not a date' cannot be converted to QDate"],
                                  'datetime_not_nullable': ["Field value 'not a datetime' cannot be converted to QDateTime"]})

    def test_value_nulls(self):
        """Test value NULL and None are not passed through the type compatibility check"""

        feature = self._feature_factory(
            {
                'text_nullable': None,
            },
            'point( 9 45 )')
        errors = feature_validator(
            feature, self.validator_project_test)
        self.assertFalse('text_nullable' in errors)

        feature = self._feature_factory(
            {
                'text_nullable': QVariant(),
            },
            'point( 9 45 )')
        errors = feature_validator(
            feature, self.validator_project_test)
        self.assertFalse('text_nullable' in errors)
