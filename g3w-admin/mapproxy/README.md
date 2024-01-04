# MappProxy Caching Bridge

This module handles individual layers caching through MapProxy.

Multiple implementations are possible through `MAPPROXY_BRIDGE` settings,
the default implementation is `shared_folder` which uses a shared directory
where the MapProxy configurations of the layers and the cached data are
stored.

## Configuration


`QDJANGO_SERVER_URL` this is required to construct the URL to the WMS for the cached layers,
it is normally the full domain name (e.g "https://www.mydomain.com" )

`MAPPROXY_BRIDGE` is the name of the module which implements the bridge with mapproxy configuration,
defaults to `shared_folder`, other implementations should go into `mapproxy/bridges`

`MAPPROXY_BRIDGE_SHARED_FOLDER_PATH` is the full path to the directory where multimapproxy looks for
configurations, is must be readable and writeable by Django.

`MAPPROXY_SERVER_URL` this is required to construct the URL for the base TMS layers, it must be
the full domain name (e.g "https://www.mydomain.com/mapproxy") of the mapproxy server.

## Testing

To start the MapProxy server for testing you can use the following method:

1. change to the directory configured in `MAPPROXY_BRIDGE_SHARED_FOLDER_PATH`
2. create a script:
    ```python
    from mapproxy.multiapp import make_wsgi_app
    # replace `<MAPPROXY_BRIDGE_SHARED_FOLDER_PATH>` with the actual path.
    application = make_wsgi_app('<MAPPROXY_BRIDGE_SHARED_FOLDER_PATH>', allow_listing=True)
    ```
3. run `gunicorn -b localhost:8080  -w 4 wsgi_app:application`

