
from django.db import close_old_connections
from huey.contrib.djhuey import HUEY
from huey_monitor.tqdm import ProcessInfo

from .utils.indexer import QGISElasticsearchIndexer

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
def es_project_indexing(project, user, task, **kwargs):
    """
    Execute ES indexing task
    """

    process_info = ProcessInfo(
        task,
        desc='Execute ES indexing task'
    )

    print('ES project indexing task')

    indexer = QGISElasticsearchIndexer('default', user, process_info=process_info)
    indexer.index_project(project)





