# G3W-ADMIN-EDITING

Django module that includes python/javascript collaborative tools for user submitted edits (map edititing).

![editing-tools](https://user-images.githubusercontent.com/9614886/218463168-a4bfb50d-214a-45e5-b1b6-1bfcbe146e5e.png)

![editing-layers](https://user-images.githubusercontent.com/9614886/218463209-37a4e543-c4e5-40c8-9fab-6c1ea1c3d31d.png)

**For more info:**

- https://g3w-suite.readthedocs.io/en/latest/g3wsuite_editing.html

---

**License:** MPL-2


### Installation

```
G3WADMIN_LOCAL_MORE_APPS = [
    ...
    'editing'
    ...
]
```

### Migrations:

```
./manage.py migrate editing
```

### Settings for module:

```
    EDITING_SHOW_ACTIVE_BUTTON: <if not set is True>

    # set if anonynous user can do editing
    EDITING_ANONYMOUS: <if not set is False>

    # set if editing activities has to be logged
    EDITING_LOGGING: <if note set is False>

    # set spatila predicate for (Multi)Polygon predicate
    EDITING_CONSTRAINT_SPATIAL_PREDICATE = 'contains' | 'intersects' (contains default)

    # Periodic features unlock task crontab time (in hours), defaults to 4
    EDITING_CHECK_FEATURES_LOCKED_CRONTAB_HOURS
```