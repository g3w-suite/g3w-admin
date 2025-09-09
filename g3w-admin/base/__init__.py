
# This will make sure the Celery app is always imported when
# Django starts so that shared_task will use this app.
# Since celery is not always required, let's ignore errors here

import logging
logger = logging.getLogger(__name__)

try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    logger.warning('Celery could not be imported, this might be ok if there are no custom suite modules that require Celery')

__version__ = (3, 10, 0, 'unstable', 0)
