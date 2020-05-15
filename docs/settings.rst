***************
Settings
***************

The following variables can be added to or edited in the project’s ``local_settings.py``:

Base settings
*************

``G3WADMIN_PROJECT_APPS``
^^^^^^^^^^^^^^^^^^^^^^^^^
Custom django map server module other than `qdjango` (QGIS-Server provider)

``G3WADMIN_LOCAL_MORE_APPS``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Custom django modules that is possible to add, i.e. ``g3w-admin-caching`` (https://github.com/g3w-suite/g3w-admin-caching) module and other third part django modules.
G3W-SUITE accessory modules:

    - ``g3w-admin-caching`` (https://github.com/g3w-suite/g3w-admin-caching)
    - ``g3w-admin-filemanager`` (https://github.com/g3w-suite/g3w-admin-filemanager)
    - ``g3w-admin-frontend`` (https://github.com/g3w-suite/g3w-admin-frontend)

``DATASOURCE_PATH``
^^^^^^^^^^^^^^^^^^^
Path to geo data directory (shp, Spatialite, raster, etc..).

.. Important::
    Last part of path could be common with QGIS project datasource path. I.e.:

    *QGIS project*:
    <datasource>/<path>/<to>/**geo_data**/<geodata>.shp</datasource>

    *local_settings.py*:
    DATASOURCE_PATH = /<local_server_<path>/<to>/**geo_data**


Mandatory.


``USER_MEDIA_ROOT``
^^^^^^^^^^^^^^^^^^^
Base user media directory, to fill with media files.
Is necessary for editing module, to manage media elements do upload on a editing session.


Client settings
***************

``CLIENT_OWS_METHOD``
^^^^^^^^^^^^^^^^^^^^^
Default is 'GET', set to 'POST' for to do OWS calling from webgis client with METHOD *POST*

Frontend portal setting
***********************

``FRONTEND``
^^^^^^^^^^^^
Default is ``False``, set to ``True`` for activate **G3W-SUITE** frontend portal like ``g3w-admin-frontend``.
If it's set to ``True`` base url path for G3W-SUITE admin section become `/admin/`.

``FRONTEND_APP``
^^^^^^^^^^^^^^^^
Module name added to ``G3WADMIN_LOCAL_MORE_APPS`` to use as `portal-frontend`. I.e.::

    G3WADMIN_LOCAL_MORE_APPS = [
        ...
        'frontend',
        ...
    ]

    FRONTEND = True
    FRONTEND_APP = 'frontend'


General layout settings
***********************

``G3WSUITE_POWERD_BY``
^^^^^^^^^^^^^^^^^^^^^^
Default is ``True``, set to ``False`` for don't show bottom `attribution` informations.

``G3WSUITE_CUSTOM_STATIC_URL``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
A custom url from to load custom static files as images, css, etc..

``G3WSUITE_MAIN_LOGO``
^^^^^^^^^^^^^^^^^^^^^^
Main admin section logo image.
Mandatory is set ``G3WSUITE_CUSTOM_STATIC_URL``

``G3WSUITE_RID_LOGO``
^^^^^^^^^^^^^^^^^^^^^
Main admin section reduced logo image.
Mandatory is set ``G3WSUITE_CUSTOM_STATIC_URL``

``G3WSUITE_LOGIN_LOGO``
^^^^^^^^^^^^^^^^^^^^^^^
Login logo image.
Mandatory is set ``G3WSUITE_CUSTOM_STATIC_URL``

``G3WSUITE_CUSTOM_TITLE``
^^^^^^^^^^^^^^^^^^^^^^^^^
**G3W-SUITE** html page title.
If is not set, title is: `g3w-admin` for admin section and `g3w-client` for webgis client.

``G3WSUITE_FAVICON``
^^^^^^^^^^^^^^^^^^^^
Favorite icon image.
Mandatory is set ``G3WSUITE_CUSTOM_STATIC_URL``

``G3WSUITE_CUSTOM_CSS``
^^^^^^^^^^^^^^^^^^^^^^^
A list of custom css files added to `admin` pages and to the `client`.
Mandatory is set ``G3WSUITE_CUSTOM_STATIC_URL``.
I.e.::

    G3WSUITE_CUSTOM_CSS = [
        G3WSUITE_CUSTOM_STATIC_URL +'css/custom.css'
    ]

Client layout settings
**********************

``G3W_CLIENT_SEARCH_TITLE``
^^^^^^^^^^^^^^^^^^^^^^^^^^^
Custom webgis client `search` section title.

``G3W_CLIENT_HEADER_CUSTOM_LINKS``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
A list of dict of custom links to add into main top bar of wbgis client.
I.e.::

    G3W_CLIENT_HEADER_CUSTOM_LINKS = [
        {
            'url': 'https://gis3w.it',
            'title': 'Gis3W company',
            'target': '_blank'
            'img': 'https://gis3w.it/wp-content/uploads/2016/10/logo_qgis-1-100x100.png?x22227'
        },
        {
           'title': 'Modal 1',
           'content': '<p>Html example content to show in modal</p>',
           'type': 'modal',
           'position': 10
       },
   ]

``G3W_CLIENT_LEGEND``
^^^^^^^^^^^^^^^^^^^^^
A dict to customize **QGIS-server** legend image generate with WMS `GetLegendGraphics` request.
I.e.::

    G3W_CLIENT_LEGEND = {
       'color': 'red',
       'fontsize': 8,
       'transparent': True,
       'boxspace': 4,
       'layerspace': 4,
       'layertitle': True,
       'layertitlespace': 4,
       'symbolspace': None,
       'iconlabelspace': 2,
       'symbolwidth': 8,
       'symbolheight': 4
    }



``G3W_CLIENT_RIGHT_PANEL``
^^^^^^^^^^^^^^^^^^^^^^^^^^
Custom properties settings for webgis right panel section.
A the moment only `with` is managed.
I.e.::

    G3W_CLIENT_RIGHT_PANEL = {
        'width': 33
    }


Editing setting
***************

``EDITING_SHOW_ACTIVE_BUTTON``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Default is ``True``. Set to ``False`` for not show editing button activate/deactivate into layers project list.

``EDITING_ANONYMOUS``
^^^^^^^^^^^^^^^^^^^^^
Default is ``False``. Set to ``True`` to render possible give to `anonymous user` editing permissions.

``EDITING_LOGGING``
^^^^^^^^^^^^^^^^^^^
Default is ``False``. Set to ``True`` to log users editing action into database.
