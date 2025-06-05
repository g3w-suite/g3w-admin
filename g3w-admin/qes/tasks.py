
from django.db import close_old_connections
from huey.contrib.djhuey import HUEY
from huey_monitor.tqdm import ProcessInfo
from qdjango.models import (
    Project,
    Layer
)

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


    # Indexing for every user
    for user in users:
        indexer = QGISElasticsearchIndexer('default', user, process_info=process_info)
        indexer.delete_index()
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





