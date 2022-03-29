****************************
Docker environment variables
****************************

The following environment variables used to deploy G3W-SUITE by docker (https://github.com/g3w-suite/g3w-suite-docker).

They must added to ``.env`` deploy file.

Requirements variables
**********************

``WEBGIS_PUBLIC_HOSTNAME``
^^^^^^^^^^^^^^^^^^^^^^^^^^

The domain to which the application will respond.

``WEBGIS_DOCKER_SHARED_VOLUME``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The path on which the docker permanent volume will be mounted with the application data inside.

Database connections parameters
-------------------------------

The follow variables re for set the connection to G3W-SUITE administration database.

``G3WSUITE_POSTGRES_USER_LOCAL``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Database username to connect to G3W-SUITE database.
If you are going to use docker postgis image, it'll be created on first run of container.

``G3WSUITE_POSTGRES_PASS``
^^^^^^^^^^^^^^^^^^^^^^^^^^
Database username password to connect to G3W-SUITE database.
If you are going to use docker postgis image, it'll be created on first run of container.

``G3WSUITE_POSTGRES_DBNAME``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Database name of G3W-SUITE database connect to.
If you are going to use docker postgis image, it'll be created on first run of container.

``G3WSUITE_POSTGRES_HOST``
^^^^^^^^^^^^^^^^^^^^^^^^^^
Database host value connect to.
If you are going to use docker postgis image, it'll be set to `postgis`

``G3WSUITE_POSTGRES_PORT``
^^^^^^^^^^^^^^^^^^^^^^^^^^
Database port value connect to.
If you are going to use docker postgis image, it'll be set to `5432`

Other not required settings
***************************


Caching system
--------------

``TILESTACHE_CACHE_TOKEN``
^^^^^^^^^^^^^^^^^^^^^^^^^^
A custom unique token to use for internal caching request.
Default value is : `374h5g96831hsgetvmkdel`.

``TILESTACHE_CACHE_BUFFER_SIZE``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Tile width/height tile map dimension.
Default value is: `256`.

``G3WSUITE_TILECACHE_PATH``
^^^^^^^^^^^^^^^^^^^^^^^^^^^
Internal path to folder to save tiles of map.
Dafault value is: `/shared-volume/tile_cache/`.


Gunicorn settings
-----------------

G3W-SUITE with docker is deployed with Gunicorn.

``G3WSUITE_GUNICORN_NUM_WORKERS``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Number of workers Gunicorn has to start with.
Default: `8`.
Usually then number of workers is equal to number of processor x 2.

``G3WSUITE_GUNICORN_MAX_REQUESTS``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Number of requests after that gunicorn worker restart.
Default: `200`.
Thi is used to compensate the python/gunicorn memory leaks.


QGIS server variables
---------------------

Every QGIS environment variables available as specified on manual
https://docs.qgis.org/3.22/en/docs/server_manual/config.html#environment-variables
can be set, important is remember to add thy to `docker-compose.yml` o  `docker-compose-consument.yml`.

The following varaible are just set into docker-compose files:

``PGSERVICEFILE``
^^^^^^^^^^^^^^^^^
Put your pg services into `./scripts/pg_service.conf file`, the conf file will be mounted into
docker container at runtime to PGSERVICEFILE path position.

``QGIS_SERVER_LOG_FILE``
^^^^^^^^^^^^^^^^^^^^^^^^

``QGIS_SERVER_LOG_LEVEL``
^^^^^^^^^^^^^^^^^^^^^^^^^

Openrouteservice
----------------

``ORS_API_ENDPOINT``
^^^^^^^^^^^^^^^^^^^^
Openrouteservice API end point.
Default: 'https://api.openrouteservice.org/v2'.

``ORS_API_KEY``
^^^^^^^^^^^^^^^
Openrouteservice API key
Optional, can be blank if the key is not required by the endpoint

``ORS_MAX_RANGES``
^^^^^^^^^^^^^^^^^^
Max number of ranges (it depends on the server configuration)
Default: 6.

``ORS_MAX_LOCATIONS``
^^^^^^^^^^^^^^^^^^^^^
Max number of locations(it depends on the server configuration)
Default: 2.

Frontend module
---------------

``FRONTEND``
^^^^^^^^^^^^
If `true` install and activate G3W-SUITEfrontend module https://github.com/g3w-suite/g3w-admin-frontend



