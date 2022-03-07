# coding=utf-8
""""Huey tasks for Editing

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-03-07'
__copyright__ = 'Copyright 2022, Gis3W'


from huey.contrib.djhuey import HUEY, db_periodic_task
from huey_monitor.tqdm import ProcessInfo
from huey import crontab
from django.core.management import call_command
from django.conf import settings


EDITING_CHECK_FEATURES_LOCKED_CRONTAB_HOURS = getattr(settings, 'EDITING_CHECK_FEATURES_LOCKED_CRONTAB_HOURS', '4')

task = HUEY.task


@db_periodic_task(crontab(hour='*/{}'.format(EDITING_CHECK_FEATURES_LOCKED_CRONTAB_HOURS)), context=True)
def editing_unlock(task):
    """
    Cron-like process to unlock feature editing every 4 hours.
    """

    process_info = ProcessInfo(
        task,
        desc='Unlock editing features'
    )

    return call_command('check_features_locked')
