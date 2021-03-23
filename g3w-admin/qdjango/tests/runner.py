# coding=utf-8
""""Custom test runner that calls exit QGIS

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-03'
__copyright__ = 'Copyright 2021, Gis3W'

from django.test.runner import DiscoverRunner, _teardown_databases
from qdjango.apps import QGS_APPLICATION, QGS_SERVER
from qgis.server import QgsConfigCache


class G3wSuiteTestRunner(DiscoverRunner):
    """Custom test runner that calls exit QGIS on tear down"""

    def teardown_databases(self, old_config, **kwargs):
        """Destroy all the non-mirror databases and cleanup projects."""

        global QGS_SERVER

        try:
            QgsConfigCache.instance().removeEntry(QGS_SERVER.project.qgis_project.fileName())
            QGS_SERVER.project = None
        except:
            pass

        QGS_APPLICATION.exitQgis()

        _teardown_databases(
            old_config,
            verbosity=self.verbosity,
            parallel=self.parallel,
            keepdb=self.keepdb,
        )
