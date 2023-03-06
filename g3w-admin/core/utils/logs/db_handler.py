# coding=utf-8
""""
    DB logs handler based on project: https://github.com/CiCiUi/django-db-logger

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-02'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'

from django.conf import settings
import logging
db_default_formatter = logging.Formatter()


class DatabaseLogHandler(logging.Handler):
    def emit(self, record):
        from core.models import StatusLog

        trace = None

        if record.exc_info:
            trace = db_default_formatter.formatException(record.exc_info)

        if settings.DB_LOGGER_ENABLE_FORMATTER:
            msg = self.format(record)
        else:
            msg = record.getMessage()

        kwargs = {
            'logger_name': record.name,
            'level': record.levelno,
            'msg': msg,
            'trace': trace
        }

        StatusLog.objects.create(**kwargs)

    def format(self, record):
        if self.formatter:
            fmt = self.formatter
        else:
            fmt = db_default_formatter

        if type(fmt) == logging.Formatter:
            record.message = record.getMessage()

            if fmt.usesTime():
                record.asctime = fmt.formatTime(record, fmt.datefmt)

            # ignore exception traceback and stack info

            return fmt.formatMessage(record)
        else:
            return fmt.format(record)
