import django.dispatch

# signal for start plugin: i.e. iternet
# data plugin to config api client from modules
initconfig_plugin_start = django.dispatch.Signal()

# signal to add extra maplayers attribute/modify maplayer attributes
post_create_maplayerattributes = django.dispatch.Signal()

# signal to add extra maplayers attribute
post_save_maplayer = django.dispatch.Signal()

"""Signal sent before edited features are sent to the backend for saving.
Listeners, should perform any validation and raise a validation error in case of failure.

Arguments:
    layer_metadata: layer metadata (includes qgis_layer)
    mode: 'editing' etc.
    data: the feature being edited/added
    user: current user from the request
"""
pre_save_maplayer = django.dispatch.Signal()

# signal to add extra maplayers attribute: i.e. iternet
pre_delete_maplayer = django.dispatch.Signal()

# signal to add extra maplayers attribute: i.e. iternet
post_serialize_maplayer = django.dispatch.Signal()

# signal after add/update map group
after_update_group = django.dispatch.Signal()

# signal after project serialization
post_serialize_project = django.dispatch.Signal()

# signal after layer serialized data on /api/config/
# send layer seralized original object and came back only dict data changed
after_serialized_project_layer = django.dispatch.Signal()

# signals pre update project
pre_update_project = django.dispatch.Signal()

# signals before delete project
before_delete_project = django.dispatch.Signal()

# signals pre delete project
pre_delete_project = django.dispatch.Signal()

# signal post project delete
post_delete_project = django.dispatch.Signal()

# signal after add/update project
after_update_project = django.dispatch.Signal()

# signal to load widgets for project
load_project_widgets = django.dispatch.Signal()

# signal to load actions for layer
load_layer_actions = django.dispatch.Signal()

# signal send to perform search by specific module
perform_client_search = django.dispatch.Signal()

# signal to load specific css from module and submodules
load_css_modules = django.dispatch.Signal()

# signal to load specific js file from module and submodules
load_js_modules = django.dispatch.Signal()

# signal to load widget into dashboard
load_dashboard_widgets = django.dispatch.Signal()

# signal send before to show user_data, return permissions by backend
pre_show_user_data = django.dispatch.Signal()

# signal send to load main navbar items
load_navbar_items = django.dispatch.Signal()

# signal send before rendering vector data layer
before_return_vector_data_layer = django.dispatch.Signal()

# signal send for execute model searches.
execute_search_on_models = django.dispatch.Signal()

# signal to load actions for project layers pages
load_project_layers_actions = django.dispatch.Signal()


