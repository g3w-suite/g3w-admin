# coding=utf-8
""""Wrapper fo Data Plotly plot_factory module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qgis.PyQt.QtXml import QDomDocument
from qplotly.vendor.DataPlotly.core.plot_factory import PlotFactory


class QplotlyFactoring(PlotFactory):

    def build_trace(self):
        """Build only trace"""

        self.trace = self._build_trace()

    def build_layout(self):
        """Build only trace"""

        self.layout = self._build_layout()

