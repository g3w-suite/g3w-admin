=================
G3W-ADIMN-CDU
=================

G3W-ADMIN-CDU è un modulo per il calcolo e la realizzazione del Certificato di Destinazione Urbanistica


Installation
------------

Add like git submodule from main g3w-admin directory

::

     git submodule add -f https://<user>@bitbucket.org/gis3w/g3w-admin-cdu.git


Add 'cdu' module to G3W_LOCAL_MORE_APPS config value inside local_settings.py:

::

    G3WADMIN_LOCAL_MORE_APPS = [
        ...
        'cdu'
        ...
    ]


Apply migrations:

::

    ./manage.py migrate cdu


Sync tree menu by manage.py:

::

    ./manage.py sitetree_resync_apps cdu

