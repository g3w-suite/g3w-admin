=====================
G3W-ADMIN-FILEMANAGER
=====================

G3W-ADMIN-FILEMANAGER is a files management module, use `Rich Filemanager framework <https://github.com/psolom/RichFilemanager)>`_.

Installation
------------

Add like git submodule from main g3w-admin directory

::

     git submodule add -f https://<user>@bitbucket.org/gis3w/g3w-admin-filemanager.git g3w-admin/filemanager


Add 'notes' module to G3WADMIN_LOCAL_MORE_APPS config value inside local_settings.py:

::

    G3WADMIN_LOCAL_MORE_APPS = [
        ...
        'filemanager'
        ...
    ]

Add root path folder for data (optional), if is not set root path is set to DATASOURCE_PATH:

::

    FILEMANAGER_ROOT_PATH = '<path_to_root_folder>'
    FILEMANAGER_MAX_UPLOAD_N_FILES = <int number| default 10>


Sync tree menu by manage.py:

::

    ./manage.py sitetree_resync_apps filemanager