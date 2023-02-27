# coding=utf-8
"""
Custom migration for update from version v.3.5.x to v.3.6.x., to avoid that every groups result deactivated
(trash workflow)

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-02-24'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('qdjango', '0103_geoconstraint_autozoom'),
    ]

    operations = [
        migrations.RunSQL(
            "UPDATE qdjango_project SET is_active=true"
        ),
    ]