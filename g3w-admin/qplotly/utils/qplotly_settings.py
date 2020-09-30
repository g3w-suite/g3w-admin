# coding=utf-8
""""Wrapper fo Data Plotly plot_settings module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qgis.PyQt.QtXml import QDomDocument
from qplotly.vendor.DataPlotly.core.plot_settings import PlotSettings


class QplotlySettings(PlotSettings):

    def write_xml_db(self):
        """Like write_to_file parent method but no write on file"""

        document = QDomDocument("dataplotly")
        elem = self.write_xml(document)
        document.appendChild(elem)

        return document

    def read_from_model(self, setting_instance):
        """Read settings from qplotly settings model instance"""

        document = QDomDocument()
        if document.setContent(setting_instance.xml):
            if self.read_xml(document.firstChildElement()):
                return True

        return False

