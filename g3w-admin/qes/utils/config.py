# coding=utf-8
"""Configuration hooks for the ``qes`` Elasticsearch indexer.

Historically ``qes`` read three settings directly:

    ``QES_INDEXING_PROJECT``   — global on/off toggle
    ``QES_INDEXING_FIELDS``    — {qgs_layer_id: [field, ...]}
    ``QES_RESULTS_OPTIONS``    — {'toshow': {qgs_layer_id: [field, ...]}}

This module abstracts those reads behind small functions so that an
external plugin (``es_conf``) can supply the same information from a
database-backed UI. If the plugin is not installed the functions fall
back to the original ``settings.*`` semantics — no behavioural change.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2026, Gis3w'
__license__ = 'MPL 2.0'

from django.conf import settings


def _es_conf_installed():
    return 'es_conf' in getattr(settings, 'INSTALLED_APPS', ())


# ---------------------------------------------------------------------------
# Public hooks
# ---------------------------------------------------------------------------
def get_indexing_fields(qgs_layer_id, project=None):
    """Return the list of field names to index for a layer, or ``None``.

    ``None`` means "no configuration matches" — the caller decides whether
    that implies "skip the layer" or "index every attribute".
    """
    if _es_conf_installed():
        try:
            from es_conf.utils.lookup import get_indexing_fields as _impl
        except ImportError:  # pragma: no cover — misconfigured install
            _impl = None
        if _impl is not None:
            fields = _impl(qgs_layer_id, project=project)
            if fields is not None:
                return fields
            # Fall through to settings only when the plugin is installed
            # but the project has *no* ProjectEsConfig row — this matches
            # the "plugin replaces settings" semantics selected during
            # design (an enabled project without configured fields will
            # simply return None, meaning "skip").
            if project is not None:
                return None

    qes_indexing = getattr(settings, 'QES_INDEXING_FIELDS', None)
    if not qes_indexing:
        return None
    return qes_indexing.get(qgs_layer_id)


def get_results_toshow(qgs_layer_id, project=None):
    """Return the list of field names to expose to the frontend, or ``None``."""
    if _es_conf_installed():
        try:
            from es_conf.utils.lookup import get_results_toshow as _impl
        except ImportError:  # pragma: no cover
            _impl = None
        if _impl is not None:
            fields = _impl(qgs_layer_id, project=project)
            if fields is not None:
                return fields
            if project is not None:
                return None

    toshow = (getattr(settings, 'QES_RESULTS_OPTIONS', None) or {}).get('toshow') or {}
    return toshow.get(qgs_layer_id)


def is_project_indexing_enabled(project):
    """Whether ES indexing is enabled for ``project``.

    When ``es_conf`` is installed:
        the answer is driven exclusively by ``ProjectEsConfig.enabled``
        for that specific project (project-scoped toggle).

    Otherwise:
        falls back to the global ``settings.QES_INDEXING_PROJECT``.
    """
    if _es_conf_installed():
        try:
            from es_conf.utils.lookup import is_project_enabled as _impl
        except ImportError:  # pragma: no cover
            return bool(getattr(settings, 'QES_INDEXING_PROJECT', False))
        return _impl(project)

    return bool(getattr(settings, 'QES_INDEXING_PROJECT', False))


def get_all_results_options(project):
    """Build the ``{'toshow': {...}}`` payload for the frontend serializer.

    - With ``es_conf`` installed and the project enabled → data from DB.
    - Otherwise → the raw ``settings.QES_RESULTS_OPTIONS`` dict (same
      behaviour as the pre-plugin code path).
    """
    if _es_conf_installed():
        try:
            from es_conf.utils.lookup import get_all_results_options as _impl
        except ImportError:  # pragma: no cover
            _impl = None
        if _impl is not None:
            result = _impl(project)
            if result:
                return result
            if project is not None:
                # Enabled project with no shown_in_results field → empty toshow.
                # A disabled/absent project falls through to settings.
                from es_conf.utils.lookup import is_project_enabled
                if is_project_enabled(project):
                    return {'toshow': {}}

    return dict(getattr(settings, 'QES_RESULTS_OPTIONS', {}) or {})


def get_periodic_task_project_ids():
    """Return the iterable of project ids the cron task should index.

    - With ``es_conf`` installed → only the enabled ones.
    - Otherwise → ``None``, meaning "let the ``qes_indexer`` command
      decide" (i.e. iterate over all projects, backward compatible).
    """
    if _es_conf_installed():
        try:
            from es_conf.utils.lookup import get_enabled_project_ids as _impl
        except ImportError:  # pragma: no cover
            return None
        return sorted(_impl())
    return None


def should_register_periodic_task():
    """Whether the huey periodic ``es_project_cron_indexing`` task should register.

    Registration happens at module import time — before the DB is
    guaranteed to be reachable — so we only inspect settings /
    ``INSTALLED_APPS``:

    - Register when the global ``settings.QES_INDEXING_PROJECT`` is True
      (legacy path) **or** when the ``es_conf`` plugin is installed (the
      task body then filters per project via ``ProjectEsConfig``).
    """
    return bool(getattr(settings, 'QES_INDEXING_PROJECT', False)) or _es_conf_installed()
