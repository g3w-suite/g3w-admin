from mapproxy.multiapp import make_wsgi_app

# replace `<MAPPROXY_BRIDGE_SHARED_FOLDER_PATH>` with the actual path.
application = make_wsgi_app('<MAPPROXY_BRIDGE_SHARED_FOLDER_PATH>', allow_listing=True)