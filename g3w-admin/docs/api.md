# G3W-SUITE Admin — REST API documentation

The admin REST API is documented automatically with
[drf-spectacular](https://drf-spectacular.readthedocs.io/) (already a project
dependency). Three endpoints are exposed:

| URL | Description |
| --- | --- |
| `/api/schema/` | OpenAPI 3 schema (YAML by default; JSON via `?format=json`). |
| `/api/schema/swagger-ui/` | Interactive Swagger UI. |
| `/api/schema/redoc/` | ReDoc rendering. |

These routes are appended to `apiUrlpatterns` in `base/urls.py`, so they live
under the configured `SITE_PREFIX_URL` (if any) and **outside** the i18n URL
prefix — i.e. they are *not* under `/en/`, `/it/`, … .

## URL conventions

The g3w-admin API is split per Django app. Each app declares its routes in an
`apiurls.py` module and is mounted with a per-app prefix:

```
/{app}/api/...
```

Examples:

- `/core/api/deploy/info/` — `core.api.views.G3WSUITEInfoAPIView`
- `/qdjango/api/projects/` — qdjango project listing
- `/qes/api/search/{project_id}/?q=...` — Elasticsearch search
- `/about/api/group/` — public groups listing

A few common endpoints live directly under `/api/` (no app prefix), for
historical reasons:

- `/api/config/{group_slug}/{project_type}/{project_id}` — client config
- `/api/initconfig/{group_slug}/{project_type}/{project_id}` — client bootstrap
- `/api/token/`, `/api/token/refresh/` — JWT tokens
- `/api/deploy/info/` — deploy info (also `/core/api/deploy/info/`)

## Authentication

Configured globally in `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`. The
schema advertises four security schemes; Swagger UI lets you pick one via the
*Authorize* button (the choice is persisted):

| Scheme | Header / cookie | Notes |
| --- | --- | --- |
| `cookieAuth` | `Cookie: g3wadmin_sessionid=…` | Django session. CSRF skipped on `CsrfExemptSessionAuthentication`. |
| `basicAuth` | `Authorization: Basic …` | Default global auth (`BasicAuthentication403`). |
| `tokenAuth` | `Authorization: Token <key>` | DRF token auth. Tokens are issued via the admin. |
| `jwtAuth` | `Authorization: Bearer <jwt>` | Issued by `/api/token/` (SimpleJWT). |

All four custom subclasses (`*Authentication403`) behave like the standard DRF
classes but return **HTTP 403** instead of 401 when auth fails, so the API
never triggers a browser auth popup.

## Response envelope

Most views inheriting from `core.api.base.views.G3WAPIView` return the
standard envelope produced by `G3WAPIResults`:

```json
{
  "result": true,
  "data": { /* endpoint-specific payload */ }
}
```

On error (handled by `G3WExceptionHandler`):

```json
{
  "result": false,
  "error": {
    "code": "validation",
    "message": "Data are not correct or insufficent!",
    "data": { /* DRF detail */ }
  }
}
```

The `core.api.schema.G3WAutoSchema` class (set as
`REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS']`) wraps every 2xx response body of
`G3WAPIView` subclasses with this envelope automatically, so a `@extend_schema`
annotation only needs to describe the *inner* `data` payload.

Pure DRF generic views (e.g. `generics.ListAPIView`) return the raw
serializer data without the envelope; pagination follows the default DRF
`PageNumberPagination` (`page`, `page_size`, max 100 per page).

## Regenerating the static schema

To dump the schema to a file for diffing in PRs:

```bash
python manage.py spectacular --file openapi.yml
# JSON:
python manage.py spectacular --file openapi.json --format openapi-json
```

Validate before committing:

```bash
python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml
```

## Annotating new endpoints

For every new APIView add a `@extend_schema(...)` decorator describing
**summary**, **parameters**, **request** and **response payload**. For a
`G3WAPIView`, describe only the inner `data` — the envelope is added by
`G3WAutoSchema`:

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers
from core.api.base.views import G3WAPIView


@extend_schema(
    summary='Short, action-oriented title',
    description='Longer explanation, including ACL rules and side effects.',
    parameters=[
        OpenApiParameter(name='project_id', type=int,
                         location=OpenApiParameter.PATH),
        OpenApiParameter(name='q', type=str,
                         location=OpenApiParameter.QUERY, required=True),
    ],
    responses=inline_serializer(
        name='MyEndpointData',
        fields={'value': serializers.JSONField()},
    ),
)
class MyView(G3WAPIView):
    ...
```

Tagging is automatic: a post-processing hook (`core.api.schema.auto_tag_by_path`)
assigns the tag based on the first URL segment, so each app gets its own
section in Swagger UI without manual `tags=[...]` arguments.

## Out of scope

- The `/django-admin/` Django admin site (not a REST API).
- The OGC WMS/WFS payload produced by `OWS` is documented as a single proxy
  endpoint; the full OGC schema is not generated.
- Third-party plugins under `plugins/` that expose their own `apiurls.py` are
  picked up automatically if the app is in `G3WADMIN_LOCAL_MORE_APPS`, but the
  tagging hook only knows the prefixes listed in
  `core/api/schema._TAG_BY_PREFIX`; add new prefixes there if you want a
  custom Swagger group.
