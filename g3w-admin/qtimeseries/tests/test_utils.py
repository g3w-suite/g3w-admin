# coding=utf-8
""""Test utils functions and methods

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-12-02'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'


import os

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qtimeseries/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE_RASTER = 'Test_project_for_ratser_time_series_qgis_3_16.qgs'
#QGS_FILE_3857 = 'G3W_SUITE_DataPlotly_test_project_310_epsg3857.qgs'




