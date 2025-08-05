=================
G3W-ADMIN-EDITING
=================

G3W-ADMIN-EDITING is a editing postgis/spatialite layers module.

Installation
------------

::

    G3WADMIN_LOCAL_MORE_APPS = [
        ...
        'editing'
        ...
    ]



Apply migrations:

::

    ./manage.py migrate editing




Settings for module:

::

    # Set if editing features butto in layers list has to be shown
    EDITING_SHOW_ACTIVE_BUTTON: <if not set is True>

    # Set if anonynous user can do editing
    EDITING_ANONYMOUS: <if not set is False>

    # Set if editing activities has to be logged
    EDITING_LOGGING: <if note set is False>

    # Set if editing features has to be locked
    EDITING_LOCK_FEATURES: <if not set is True> 

    # Set spatila predicate for (Multi)Polygon predicate
    EDITING_CONSTRAINT_SPATIAL_PREDICATE = 'contains' | 'intersects' (contains default)

    # Periodic features unlock task crontab time (in hours), defaults to 4
    EDITING_CHECK_FEATURES_LOCKED_CRONTAB_HOURS
