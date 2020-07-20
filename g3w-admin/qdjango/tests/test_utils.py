# coding=utf-8
"""
    Test Qdjango module for utils methods and functions
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11-28'
__copyright__ = 'Copyright 2019, GIS3W'


from .base import QdjangoTestBase
from django.test import TestCase, override_settings
from django.core.files import File
from django.conf import settings
from qdjango.models import Project, Layer, Widget
from qdjango.utils.data import QgisProject, QgisPgConnection, QgisProjectSettingsWMS
from qdjango.utils.exceptions import QgisProjectLayerException, QgisProjectException
from qdjango.utils.structure import get_schema_table, datasource2dict, datasourcearcgis2dict
from qdjango.utils.models import get_widgets4layer, comparepgdatasoruce
from qdjango.templatetags.qdjango_tags import is_geom_type_gpx_compatible
from collections import OrderedDict
import os
import json
import requests

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qdjango/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE = 'g3wsuite_project_test_qgis310.qgs'


class QgisProjectTest(TestCase):

    @override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
    def setUp(self):

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        self.project = QgisProject(qgis_project_file)
        qgis_project_file.close()

    def test_qgis_project(self):

        # check general data
        # -----------------------------------------
        self.assertEqual(self.project.title, 'G3W-Suite project test')
        self.assertEqual(self.project.name, 'G3W-Suite project test')
        self.assertEqual(self.project.qgisVersion, '3.10.7-A Coruña')
        self.assertEqual(self.project.srid, 4326)
        self.assertEqual(self.project.units, 'degrees')

        # check initialExtent
        # -----------------------------------------
        test_initial_extent_data = {
            'xmin': -33.65090664007660592,
            'ymin': 14.631795352726051,
            'xmax': 60.84904085992335609,
            'ymax': 85.35817115461282
        }

        for k in test_initial_extent_data.keys():
            self.assertAlmostEqual(self.project.initialExtent[k], test_initial_extent_data[k], 1)

        # check maxExtent
        # -----------------------------------------
        test_max_extent_data = {
            'xmin': -188.9998950000000093,
            'ymin': -94.66237441014119725,
            'xmax': 188.9998950000000093,
            'ymax': 88.27205541014122048
        }

        for k in test_max_extent_data.keys():
            self.assertAlmostEqual(self.project.maxExtent[k], test_max_extent_data[k], 3)

        # check wms use layer ids:
        # -----------------------------------------

        self.assertFalse(self.project.wmsuselayerids)

        # test wfsLyers
        test_wfs_layers = [
            'cities10000eu20171228095720113',
            'countries_simpl20171228095706310',
            'rivers20171228095726368'
        ]

        self.assertEqual(self.project.wfsLayers, test_wfs_layers)

        # test wfstLayer
        # -----------------------------------------
        test_wfst_layers = {
            'INSERT': ['countries_simpl20171228095706310'],
            'UPDATE': ['cities10000eu20171228095720113'],
            'DELETE': ['rivers20171228095726368']
        }

        self.assertEqual(self.project.wfstLayers, test_wfst_layers)

        # test_layersTree
        # -----------------------------------------
        test_layersTree_data = [
            {'visible': True, 'expanded': True, 'name': 'Rivers', 'id': 'rivers20171228095726368'},
            {'visible': True, 'expanded': True, 'name': 'Cities', 'id': 'cities10000eu20171228095720113'},
            {'visible': True, 'expanded': True, 'name': 'Countries', 'id': 'countries_simpl20171228095706310'},
            {'visible': True, 'expanded': True, 'name': 'Dem', 'id': 'europa_dem20171228095729169'},
            {'name': 'Blue Marble World Elevation and Bathymetry Raster', 'expanded': True,
             'id': 'Blue_Marble_World_Elevation_and_Bathymetry_Raster_3597b571_68a3_4344_867c_8dcd1d44eaf2',
             'visible': True},
            {'name': 'virtual_layer', 'expanded': True, 'id': 'virtual_layer_330ccb98_61d9_4454_b316_5e5e3b193df4',
             'visible': True}
        ]

        self.assertEqual(self.project.layersTree, test_layersTree_data)

        # check layerRelations
        # ------------------------------------------
        layer_relations_to_check = '[{"referencingLayer": "cities10000eu20171228095720113", "strength": "Association", "referencedLayer": "countries_simpl20171228095706310", "name": "countries-citites", "id": "cities1000_ISO2_CODE_countries__ISOCODE", "fieldRef": {"referencingField": "ISO2_CODE", "referencedField": "ISOCODE"}}]'
        self.assertEqual(self.project.layerRelations, json.loads(layer_relations_to_check))


    def test_layers(self):

        # check layers in project
        # -------------------------------------
        self.assertEqual(len(self.project.layers), 6)

        for layer in self.project.layers:
            if layer.layerId == 'countries_simpl20171228095706310':
                self.assertEqual(layer.title, 'Countries')
                self.assertEqual(layer.name, 'Countries')
                self.assertEqual(layer.origname, 'countries')
                self.assertEqual(layer.layerType, 'ogr')
                self.assertEqual(layer.minScale, 100000000)
                self.assertEqual(layer.maxScale, 0)
                self.assertFalse(layer.scaleBasedVisibility)
                self.assertEqual(layer.wfsCapabilities, 1)
                self.assertTrue(layer.isVisible)
                self.assertEqual(layer.srid, 4030)
                self.assertEqual(layer.editOptions, 1)

                # important check datasource, main for shp and raster data
                # --------------------------------------------------------
                self.assertEqual(layer.datasource, DATASOURCE_PATH + 'geodata/countries.shp')

                # check alias fields
                # --------------------------------------------------------
                '''
                <alias name="" field="ISOCODE" index="0"/>
                <alias name="" field="NAME_LOCAL" index="1"/>
                <alias name="" field="NAME_EN" index="2"/>
                <alias name="" field="CAPITAL_EN" index="3"/>
                <alias name="" field="NAME_DE" index="4"/>
                <alias name="" field="CAPITAL_DE" index="5"/>
                <alias name="" field="NAME_IT" index="6"/>
                <alias name="" field="CAPITAL_IT" index="7"/>
                <alias name="" field="NAME_FR" index="8"/>
                <alias name="" field="CAPITAL_FR" index="9"/>
                <alias name="" field="NAME_BR" index="10"/>
                <alias name="" field="CAPITAL_BR" index="11"/>
                <alias name="" field="NAME_ES" index="12"/>
                <alias name="" field="CAPITAL_ES" index="13"/>
                <alias name="" field="POPULATION" index="14"/>
                <alias name="" field="AREA_KM2" index="15"/>
                <alias name="" field="ISO_NUM" index="16"/>
                '''
                aliases_to_check = OrderedDict({
                    'ISOCODE': 'ISOCODE',
                    'NAME_LOCAL': 'NAME_LOCAL',
                    'NAME_EN': 'NAME_EN',
                    'CAPITAL_EN': 'CAPITAL_EN',
                    'NAME_DE': 'NAME_DE',
                    'CAPITAL_DE': 'CAPITAL_DE',
                    'NAME_IT': 'NAME_IT',
                    'CAPITAL_IT': 'CAPITAL_IT',
                    'NAME_FR': 'NAME_FR',
                    'CAPITAL_FR': 'CAPITAL_FR',
                    'NAME_BR': 'NAME_BR',
                    'CAPITAL_BR': 'CAPITAL_BR',
                    'NAME_ES': 'NAME_ES',
                    'CAPITAL_ES': 'CAPITAL_ES',
                    'POPULATION': 'POPULATION',
                    'AREA_KM2': 'AREA_KM2',
                    'ISO_NUM': 'ISO_NUM'
                })

                self.assertEqual(layer.aliases, aliases_to_check)


                # check columns
                # --------------------------------------------------------
                columns_to_check = '[{"name": "ISOCODE", "type": "QSTRING", "label": "ISOCODE"}, {"name": "NAME_LOCAL", "type": "QSTRING", "label": "NAME_LOCAL"}, {"name": "NAME_EN", "type": "QSTRING", "label": "NAME_EN"}, {"name": "CAPITAL_EN", "type": "QSTRING", "label": "CAPITAL_EN"}, {"name": "NAME_DE", "type": "QSTRING", "label": "NAME_DE"}, {"name": "CAPITAL_DE", "type": "QSTRING", "label": "CAPITAL_DE"}, {"name": "NAME_IT", "type": "QSTRING", "label": "NAME_IT"}, {"name": "CAPITAL_IT", "type": "QSTRING", "label": "CAPITAL_IT"}, {"name": "NAME_FR", "type": "QSTRING", "label": "NAME_FR"}, {"name": "CAPITAL_FR", "type": "QSTRING", "label": "CAPITAL_FR"}, {"name": "NAME_BR", "type": "QSTRING", "label": "NAME_BR"}, {"name": "CAPITAL_BR", "type": "QSTRING", "label": "CAPITAL_BR"}, {"name": "NAME_ES", "type": "QSTRING", "label": "NAME_ES"}, {"name": "CAPITAL_ES", "type": "QSTRING", "label": "CAPITAL_ES"}, {"name": "POPULATION", "type": "QLONGLONG", "label": "POPULATION"}, {"name": "AREA_KM2", "type": "QLONGLONG", "label": "AREA_KM2"}, {"name": "ISO_NUM", "type": "INT", "label": "ISO_NUM"}]'

                self.assertEqual(layer.columns, json.loads(columns_to_check))

                # check excludeAttributesWMS
                # --------------------------------------------------------
                self.assertCountEqual(layer.excludeAttributesWMS, [])

                # check excludeAttributesWFS
                # --------------------------------------------------------
                self.assertCountEqual(layer.excludeAttributesWFS, [])

                # check geometrytype
                # --------------------------------------------------------
                self.assertEqual(layer.geometrytype, 'MultiPolygon')

                # check vectorjoins
                # --------------------------------------------------------
                self.assertCountEqual(layer.vectorjoins, [])

                # check editTypes
                # --------------------------------------------------------

                edit_types_to_check = '{"ISOCODE": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_LOCAL": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_EN": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "CAPITAL_EN": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_DE": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "CAPITAL_DE": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_IT": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "CAPITAL_IT": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_FR": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "CAPITAL_FR": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_BR": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "CAPITAL_BR": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "NAME_ES": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "CAPITAL_ES": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "POPULATION": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "AREA_KM2": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}, "ISO_NUM": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}}'

                self.assertEqual(layer.editTypes, json.loads(edit_types_to_check))

                # check editorlayout
                # --------------------------------------------------------
                self.assertEqual(layer.editorlayout, 'generallayout')

                # check editorformstructure
                # --------------------------------------------------------
                self.assertIsNone(layer.editorformstructure)

            if layer.layerId == 'cities10000eu20171228095720113':

                # check editorlayout
                # --------------------------------------------------------
                self.assertEqual(layer.editorlayout, 'tablayout')

                # check editorformstructure
                # --------------------------------------------------------

                editor_form_structure_to_check = '[{"name": "Folder 1", "showlabel": true, "groupbox": false, "columncount":1, "nodes": [{"showlabel": true, "index":0, "field_name": "GEONAMEID", "alias": "Geo named"}, {"showlabel": true, "index":1, "field_name": "NAME", "alias": "Name"}, {"showlabel": true, "index":2, "field_name": "ASCIINAME", "alias": "Ascii name"}]}, {"name": "Folder 2", "showlabel": true, "groupbox": false, "columncount":1, "nodes": [{"showlabel": true, "index":4, "field_name": "POPULATION", "alias": "POPULATION"}, {"showlabel": true, "index":5, "field_name": "GTOPO30", "alias": "GTOPO30"}, {"showlabel": true, "index":3, "field_name": "ISO2_CODE", "alias": "ISO Code"}]}]'
                self.assertEqual(layer.editorformstructure, json.loads(editor_form_structure_to_check))

                # check editTypes
                # --------------------------------------------------------
                edit_types_to_check = '{"GEONAMEID": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": false, "UseHtml": false}, "NAME": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": false, "UseHtml": false}, "ASCIINAME": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": false, "UseHtml": false}, "ISO2_CODE": {"widgetv2type": "UniqueValues", "fieldEditable": "1", "values": [], "Editable": false}, "POPULATION": {"widgetv2type": "Range", "fieldEditable": "1", "values": [], "AllowNull": true, "Max": 2147483647, "Min": -2147483648, "Precision": 0, "Step": 1, "Style": "SpinBox"}, "GTOPO30": {"widgetv2type": "TextEdit", "fieldEditable": "1", "values": [], "IsMultiline": "0", "UseHtml": "0"}}'
                self.assertEqual(layer.editTypes, json.loads(edit_types_to_check))



    def test_get_schema_table(self):

        checks = [
            ('"schema"."table"', ('schema', 'table')),
            ('"_schema"."_table"', ('_schema', '_table')),
            ('"_sch90._ema"."_tab90._le"', ('_sch90._ema', '_tab90._le')),
            ('schema.table', ('schema', 'table')),
            ('"sche.ma"."table"', ('sche.ma', 'table')),
            ('"schema"."tab.le"', ('schema', 'tab.le')),
            ('"sche.ma"."tab.le"', ('sche.ma', 'tab.le')),
            ('"tab.le"', ('public', 'tab.le')),
            ('"table"', ('public', 'table')),
            ('"public"."net_datacenter_hyperscale_v0.1_ch_190321"', ('public', 'net_datacenter_hyperscale_v0.1_ch_190321')),
            ('"link"."Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN"', ('link', 'Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN'))
        ]

        for check in checks:
            self.assertEqual(get_schema_table(check[0]), check[1])


    def test_dataSourceToDict(self):

        res = datasource2dict("dbname='data_testing' host=web-gis.postgres.database.azure.com port=5432 sslmode=require user='testing@webgis' password='#\\\'$%?@^&rX43#/' srid=4326 type=Point checkPrimaryKeyUnicity='1' table=\"public\".\"net_datacenter_hyperscale_v0.1_ch_190321\" (geom) sql=")

        self.assertEqual(res['checkPrimaryKeyUnicity'], '1')
        self.assertEqual(res['dbname'], 'data_testing')
        self.assertEqual(res['host'], 'web-gis.postgres.database.azure.com')
        self.assertEqual(res['port'], '5432')
        self.assertEqual(res['sslmode'], 'require')
        self.assertEqual(res['password'], '#\\\'$%?@^&rX43#/')
        self.assertEqual(res['user'], 'testing@webgis')
        self.assertEqual(res['table'], "\"public\".\"net_datacenter_hyperscale_v0.1_ch_190321\"")

        res = datasource2dict('dbname=\'data_testing\' user=\'xxx\' password=\'xxx\' host=localhost port=5432 sslmode=disable key=\'id\' srid=4326 type=LineStringZ checkPrimaryKeyUnicity=\'0\' table="centurylink"."Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN" (geom) sql=')
        self.assertEqual(res['table'], "\"centurylink\".\"Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN\"")
        self.assertEqual(res['checkPrimaryKeyUnicity'], '0')
        self.assertEqual(res['dbname'], 'data_testing')
        self.assertEqual(res['host'], 'localhost')
        self.assertEqual(res['port'], '5432')
        self.assertEqual(res['sslmode'], 'disable')
        self.assertEqual(res['password'], 'xxx')
        self.assertEqual(res['user'], 'xxx')

        # for Postgis Raster
        res = datasource2dict(
            "PG:  dbname='geo_demo' host=localhost user=postgres password=postgres port=5432 mode=2 schema='raster' column='rast' table='nasa_density_population' ")
        self.assertEqual(res['dbname'], 'geo_demo')
        self.assertEqual(res['table'], 'nasa_density_population')
        self.assertEqual(res['host'], 'localhost')
        self.assertEqual(res['user'], 'postgres')
        self.assertEqual(res['password'], 'postgres')
        self.assertEqual(res['port'], '5432')
        self.assertEqual(res['mode'], '2')
        self.assertEqual(res['schema'], 'raster')



    def test_dataSourceArcGisToDict(self):

        res = datasourcearcgis2dict(
            'crs=\'EPSG:4326\' format=\'PNG24\' layer=\'2\' url=\'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer\'')
        self.assertEqual(res['crs'], 'EPSG:4326')
        self.assertEqual(res['format'], 'PNG24')
        self.assertEqual(res['layer'], '2')
        self.assertEqual(res['url'],
                         'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer')


class QgisWMSProjectSettingsTest(TestCase):
    """ Test parsing and reading or WMS project settings service result """

    @override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
    def setUp(self):

        # build service url and get response
        self.qgs_prj_file_path = '{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE)

        with File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, 'getProjectSettings_g3wsuite_project_test_qgis310.xml'
        ), 'r')) as project_settings_file:
            self.project_settings = QgisProjectSettingsWMS(bytes(project_settings_file.read(), 'utf-8'))

    def test_metadata(self):

        metadata = self.project_settings.metadata
        self.assertEqual(metadata['name'], 'WMS')
        self.assertEqual(metadata['fees'], 'conditions unknown')
        self.assertEqual(metadata['accessconstraints'], 'None')
        self.assertEqual(metadata['keywords'], ['infoMapAccessService'])


        #FIXME: look bettr to metadata iformations

    def test_composertemplates(self):

        templates = self.project_settings.composerTemplates
        self.assertEqual(len(templates), 1)
        self.assertEqual(templates[0]['name'], 'A4')
        self.assertEqual(templates[0]['w'], '297')
        self.assertEqual(templates[0]['h'], '210')
        self.assertEqual(len(templates[0]['maps']), 1)

        tmap = templates[0]['maps'][0]
        self.assertEqual(tmap['name'], 'map0')
        self.assertEqual(tmap['w'], 189.53)
        self.assertEqual(tmap['h'], 117.7594485294118)





class QdjangoUtilsTest(QdjangoTestBase):
    """ Test for utils methods and functions with QGIS 3.4.x project """

    def test_get_widget4layer(self):
        """ Test same name util func """

        # check if widget for every layer are 3 items:
        self.assertEqual(len(get_widgets4layer(self.fake_layer1)), 0)
        self.assertEqual(len(get_widgets4layer(self.fake_layer2)), 0)
        self.assertEqual(len(get_widgets4layer(self.fake_layer3)), 0)

        # create widget only one for all 3 fake layers
        widget = Widget(
            name='fakewidget',
            body='{}',
            datasource=self.fake_layer1.datasource,
            widget_type='search'
        )
        widget.save()

        # check after creation of 1 widget
        self.assertEqual(len(get_widgets4layer(self.fake_layer1)), 1)
        self.assertEqual(len(get_widgets4layer(self.fake_layer2)), 1)
        self.assertEqual(len(get_widgets4layer(self.fake_layer3)), 1)

        # tear down
        widget.delete()

    def test_comparepgdatasource(self):
        """ Test same name function """

        # differ only by pk
        ds1 = "dbname='comune_capannori' host=0.0.0.0 port=5432 user='aaa' password='aaa' sslmode=disable key='gid' srid=3003 type=MultiPolygon table=\"dati_catastali\".\"catasto\" (geom) sql="
        ds2 = "dbname='comune_capannori' host=0.0.0.0 port=5432 user='aaa' password='aaa' sslmode=disable key='id' srid=3003 type=MultiPolygon table=\"dati_catastali\".\"catasto\" (geom) sql="

        self.assertTrue(comparepgdatasoruce(ds1, ds2))

        # differ by host and pk
        ds1 = "dbname='comune_capannori' host=0.0.0.1 port=5432 user='aaa' password='aaa' sslmode=disable key='gid' srid=3003 type=MultiPolygon table=\"dati_catastali\".\"catasto\" (geom) sql="
        ds2 = "dbname='comune_capannori' host=0.0.0.0 port=5432 user='aaa' password='aaa' sslmode=disable key='id' srid=3003 type=MultiPolygon table=\"dati_catastali\".\"catasto\" (geom) sql="

        self.assertFalse(comparepgdatasoruce(ds1, ds2))


class QdjangoUtilsDataValidators(QdjangoTestBase):
    """Test for validators loaded into  import data classes"""

    def test_datasource_validator(self):
        """ Test layer exception for validator DataSourceNotExists"""

        qgis_filename = 'test_wrong_geodata_gdal_type_path.qgs'
        qgis_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, qgis_filename), 'r', encoding='utf-8'))

        # DatasourceExists
        project = QgisProject(qgis_file)
        project.group = self.project_group
        with self.assertRaises(QgisProjectLayerException):
            project.clean()

        qgis_file.close()

        # indirect datasource validator into getDataFields for ogr layer
        qgis_filename = 'test_wrong_geodata_org_type_path.qgs'
        qgis_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, qgis_filename), 'r', encoding='utf-8'))

        # Project is not valid
        with self.assertRaises(Exception) as exc:
            project = QgisProject(qgis_file)
        qgis_file.close()


class TestTemplateTags(QdjangoTestBase):
    """Test qdjango template tags"""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.qdjango_project = Project.objects.all()[0]
        cls.world = cls.qdjango_project.layer_set.filter(
            qgs_layer_id='world20181008111156525')[0]
        cls.spatialite_points = cls.qdjango_project.layer_set.filter(
            qgs_layer_id='spatialite_points20190604101052075')[0]

    def test_is_geom_type_gpx_compatible(self):
        """Test homonymous function"""

        self.assertTrue(is_geom_type_gpx_compatible(self.spatialite_points))
        self.assertFalse(is_geom_type_gpx_compatible(self.world))