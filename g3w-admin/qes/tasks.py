from django.conf import settings
from django.db import close_old_connections
from django.core.management import call_command
from huey.contrib.djhuey import HUEY, db_periodic_task
from huey_monitor.tqdm import ProcessInfo
from qdjango.models import (
    Project,
    Layer
)

from .utils.indexer import QGISElasticsearchIndexer
from .utils.config import (
    get_periodic_task_project_ids,
    should_register_periodic_task,
)

from functools import wraps

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

@db_task(context=True)
def es_project_indexing(obj_to_index, users, task, **kwargs):
    """
    Execute ES indexing task
    """

    process_info = ProcessInfo(
        task,
        desc='Execute ES indexing task'
    )

    if isinstance(obj_to_index, Project):
        project = obj_to_index
        layer = None
    elif isinstance(obj_to_index, Layer):
        project = obj_to_index.project
        layer = obj_to_index


    # Refresh indexing for every user by removing stale documents only for
    # the current project/layer before re-indexing the visible set.
    for user in users:
        indexer = QGISElasticsearchIndexer('default', user, process_info=process_info)
        indexer.delete_documents(project, layer)
        indexer.index_project(project, layer)

@db_task(context=True)
def es_project_delete(obj_to_index, users, task, **kwargs):
    """
    Execute ES delete documents task
    """

    process_info = ProcessInfo(
        task,
        desc='Execute ES delete documents task'
    )

    if isinstance(obj_to_index, Project):
        project = obj_to_index
        layer = None
    elif isinstance(obj_to_index, Layer):
        project = obj_to_index.project
        layer = obj_to_index


    # Indexing for every user
    for user in users:
        indexer = QGISElasticsearchIndexer('default', user, process_info=process_info)
        indexer.delete_documents(project, layer)


# The periodic task is registered when either:
#   - the legacy ``settings.QES_INDEXING_PROJECT`` is True, OR
#   - the ``es_conf`` plugin is installed (per-project ``enabled`` flag
#     is consulted inside the task).
#
# QES_INDEXING_CRON_SCHEDULE = crontab(hour='*/4')
#
# If QES_INDEXING_CRON_PRJIDS is defined, then the task will
# index only the projects defined in the list, otherwise it will index
# every project. I.e.:
#
# QES_INDEXING_CRON_PRJIDS = '1 2 3'

if should_register_periodic_task() and settings.QES_INDEXING_CRON_SCHEDULE:
    @db_periodic_task(settings.QES_INDEXING_CRON_SCHEDULE, context=True)
    def es_project_cron_indexing(task):
        """
        Cron-like process to index projects.
        """

        process_info = ProcessInfo(
            task,
            desc='Cron-like process to index projects'
        )

        # 1) Explicit override from settings takes precedence.
        try:
            options = settings.QES_INDEXING_CRON_PRJIDS
        except Exception:
            options = {}

        # 2) When es_conf is installed and no explicit override is set,
        #    restrict to the projects with ``ProjectEsConfig.enabled=True``.
        if not options:
            enabled_ids = get_periodic_task_project_ids()
            if enabled_ids is not None:
                if not enabled_ids:
                    # Nothing to index — skip the call entirely.
                    return None
                options = {'prj_ids': [str(pk) for pk in enabled_ids]}

        return call_command('qes_indexer', **options)


