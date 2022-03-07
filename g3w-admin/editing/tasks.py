# coding=utf-8
""""Huey tasks for Editing

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-03-07'
__copyright__ = 'Copyright 2022, Gis3W'

from functools import wraps

from django.db import close_old_connections
from huey.contrib.djhuey import HUEY, db_periodic_task
from huey_monitor.tqdm import ProcessInfo
from huey import crontab
from django.core.management import call_command

task = HUEY.task


def close_db(fn):
    """Decorator called by db_task() to be used with tasks that may operate
    on the database.

    This implementation is a copy of djhuey implementation but it falls
    back to noop when HUEY.testing is True.

    Set HUEY.testing to True to skip DB connection close.

    """

    @wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        finally:
            if not HUEY.immediate and not getattr(HUEY, 'testing', False):
                close_old_connections()
    return inner


def db_task(*args, **kwargs):
    """Decorator to be used with tasks that may operate on the database.

    This implementation is a copy of djhuey implementation but it falls
    back to noop when HUEY.testing is True.

    Set HUEY.testing to True to skip DB connection close.

    """

    def decorator(fn):
        ret = task(*args, **kwargs)(close_db(fn))
        ret.call_local = fn
        return ret
    return decorator


@db_periodic_task(crontab(hour='*/4'), context=True)
def editing_unlock(task):
    """
    Cron-like process to unlock feature editing every 4 hours.
    """

    process_info = ProcessInfo(
        task,
        desc='Unlock editing features'
    )

    return call_command('check_features_locked')
