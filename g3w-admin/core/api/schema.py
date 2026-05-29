# coding=utf-8
"""drf-spectacular customisation for G3W-SUITE.

Provides:
- `G3WAutoSchema`: an `AutoSchema` subclass that wraps responses of views
  extending `core.api.base.views.G3WAPIView` in the standard
  ``{"result": bool, "data": ..., "error": ...}`` envelope.
- `OpenApiAuthenticationExtension` subclasses for the custom `*403` auth
  classes so that Swagger UI shows the correct security schemes.
"""

__author__ = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2026, Gis3w'
__license__ = 'MPL 2.0'

from drf_spectacular.openapi import AutoSchema
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class G3WAutoSchema(AutoSchema):
    """Default schema class used by all DRF views in g3w-admin.

    For views inheriting from `G3WAPIView` it wraps every 2xx response body
    in the standard envelope returned by `G3WAPIResults`.
    """

    def _is_g3w_api_view(self):
        try:
            from core.api.base.views import G3WAPIView
        except Exception:
            return False
        return isinstance(self.view, G3WAPIView)

    def _get_response_bodies(self, direction='response'):
        responses = super()._get_response_bodies(direction=direction)
        if direction != 'response' or not self._is_g3w_api_view():
            return responses

        for status_code, response in list(responses.items()):
            # Only wrap 2xx responses; errors already use a different shape.
            try:
                code_int = int(str(status_code).split(' ')[0])
            except (TypeError, ValueError):
                continue
            if not (200 <= code_int < 300):
                continue
            for media in (response.get('content') or {}).values():
                inner = media.get('schema')
                if inner is None:
                    continue
                media['schema'] = {
                    'type': 'object',
                    'properties': {
                        'result': {'type': 'boolean', 'example': True},
                        'data': inner,
                    },
                    'required': ['result'],
                }
        return responses


class _AuthExt(OpenApiAuthenticationExtension):
    """Base helper: shared mapping for the *403 auth subclasses."""

    def get_security_definition(self, auto_schema):  # pragma: no cover - trivial
        return self.scheme


class BasicAuth403Extension(_AuthExt):
    target_class = 'core.api.authentication.BasicAuthentication403'
    name = 'basicAuth'
    scheme = {'type': 'http', 'scheme': 'basic'}


class TokenAuth403Extension(_AuthExt):
    target_class = 'core.api.authentication.TokenAuthentication403'
    name = 'tokenAuth'
    scheme = {
        'type': 'apiKey',
        'in': 'header',
        'name': 'Authorization',
        'description': 'Token-based authentication. Header: `Authorization: Token <key>`.',
    }


class JWTAuth403Extension(_AuthExt):
    target_class = 'core.api.authentication.JWTAuthentication403'
    name = 'jwtAuth'
    scheme = {
        'type': 'http',
        'scheme': 'bearer',
        'bearerFormat': 'JWT',
    }


class CsrfExemptSessionAuthExtension(_AuthExt):
    target_class = 'core.api.authentication.CsrfExemptSessionAuthentication'
    name = 'cookieAuth'
    scheme = {
        'type': 'apiKey',
        'in': 'cookie',
        'name': 'g3wadmin_sessionid',
        'description': 'Django session cookie. CSRF check is skipped on this auth class.',
    }


# Post-processing hook: tag every operation by the first URL segment so the
# Swagger UI is grouped per Django app (about, core, client, qdjango, ...).
_TAG_BY_PREFIX = {
    'about': 'about',
    'caching': 'caching',
    'editing': 'editing',
    'filemanager': 'filemanager',
    'qdjango': 'qdjango',
    'qes': 'qes',
    'qplotly': 'qplotly',
    'qtimeseries': 'qtimeseries',
    'usersmanage': 'usersmanage',
    'interface': 'OWS',
    'ows': 'OWS',
    'vector': 'core',
    'raster': 'core',
    'crs': 'core',
    'html2pdf': 'core',
    'shorturl': 'core',
    'permalink': 'core',
    'jx': 'core',
}


def auto_tag_by_path(result, generator, request, public):
    """drf-spectacular POSTPROCESSING_HOOK.

    Assigns a single tag based on the URL path so endpoints are grouped per
    app without requiring per-view `@extend_schema` annotations.
    """
    for path, methods in (result.get('paths') or {}).items():
        first = path.lstrip('/').split('/', 1)[0].lower()
        if first.startswith('api'):
            # Catch generic /api/... endpoints (client / core mix)
            second = path.lstrip('/').split('/', 2)
            second = second[1].lower() if len(second) > 1 else ''
            if second in ('config', 'initconfig', 'embed'):
                tag = 'client'
            elif second in ('token',):
                tag = 'usersmanage'
            else:
                tag = 'core'
        else:
            tag = _TAG_BY_PREFIX.get(first, first or 'core')
        for op in methods.values():
            if isinstance(op, dict) and 'responses' in op:
                op['tags'] = [tag]
    return result


# ---------------------------------------------------------------------------
# Preprocessing hook: unwrap function-based dispatchers.
#
# Endpoints like /vector/api/data/... and /vector/api/commit/... are routed
# through a plain function that, at runtime, instantiates the correct APIView
# based on `project_type`. drf-spectacular cannot introspect a function and
# silently drops them. Here we detect the known dispatchers and substitute
# the callback with the underlying APIView (the `qdjango` implementation,
# which is the only project_type shipped by default).
# ---------------------------------------------------------------------------

def _resolve_dispatcher_substitute(callback):
    try:
        from core.api.views import (
            LAYERVECTORVIEW_CLASSES,
            LAYERRASTERVIEW_CLASSES,
            layer_vector_view,
            layer_raster_view,
        )
        from editing.api.views import (
            LAYERCOMMITVECTORVIEW_CLASSES,
            layer_commit_vector_view,
        )
    except Exception:
        return None

    mapping = {
        layer_vector_view: LAYERVECTORVIEW_CLASSES,
        layer_raster_view: LAYERRASTERVIEW_CLASSES,
        layer_commit_vector_view: LAYERCOMMITVECTORVIEW_CLASSES,
    }
    # Match the callback itself, the inner __wrapped__ function (csrf_exempt),
    # or any function with the same identity reached by unwrapping.
    candidates = [callback, getattr(callback, '__wrapped__', None)]
    view_classes = None
    for cand in candidates:
        if cand is None:
            continue
        if cand in mapping:
            view_classes = mapping[cand]
            break
    if view_classes is None:
        return None
    view_cls = view_classes.get('qdjango') or next(iter(view_classes.values()), None)
    return view_cls.as_view() if view_cls else None


def unwrap_dispatchers(endpoints):
    """drf-spectacular PREPROCESSING_HOOK: expose dispatcher endpoints."""
    return [
        (path, path_regex, method, _resolve_dispatcher_substitute(cb) or cb)
        for path, path_regex, method, cb in endpoints
    ]


# ---------------------------------------------------------------------------
# Custom schema generator: rewrites function-based dispatchers to their
# underlying APIView *before* DRF's `should_include_endpoint` filters them
# out. The PREPROCESSING_HOOKS run too late for this — by then the function
# views have already been dropped.
# ---------------------------------------------------------------------------

from drf_spectacular.generators import (
    SchemaGenerator as _SpectacularSchemaGenerator,
    EndpointEnumerator as _SpectacularEndpointEnumerator,
)
from django.urls import URLPattern


class G3WEndpointEnumerator(_SpectacularEndpointEnumerator):
    """Rewrites known dispatcher callbacks to the real APIView callback."""

    def _get_api_endpoints(self, patterns=None, prefix=''):
        if patterns is None:
            patterns = self.patterns
        for pattern in patterns:
            if isinstance(pattern, URLPattern):
                substitute = _resolve_dispatcher_substitute(pattern.callback)
                if substitute is not None:
                    pattern.callback = substitute
        return super()._get_api_endpoints(patterns=patterns, prefix=prefix)


class G3WSchemaGenerator(_SpectacularSchemaGenerator):
    endpoint_inspector_cls = G3WEndpointEnumerator

