import django.dispatch

# signal for start plugin: i.e. iternet
initconfig_plugin_start = django.dispatch.Signal(providing_args=["projectType", "project"])

# signal to add extra maplayers attribute: i.e. iternet
post_create_maplayerattributes = django.dispatch.Signal(providing_args=["layer"])

# signal to add extra maplayers attribute: i.e. iternet
post_save_maplayer = django.dispatch.Signal(providing_args=["layer", "mode", "data"])

# signal to add extra maplayers attribute: i.e. iternet
pre_delete_maplayer = django.dispatch.Signal(providing_args=["layer", "data"])

# signal to add extra maplayers attribute: i.e. iternet
post_serialize_maplayer = django.dispatch.Signal(providing_args=["layer", "data"])

# signals pre update project
pre_update_project = django.dispatch.Signal(providing_args=["projectType", "project"])

# signals pre delet project
pre_delete_project = django.dispatch.Signal(providing_args=["projectType", "project", "projects"])

# signal to load widgets for project
load_project_widgets = django.dispatch.Signal(providing_args=["app_name", "project"])

# signal to load specific css from module and submodules
load_css_modules = django.dispatch.Signal()

# signal to load specific js file from module and submodules
load_js_modules = django.dispatch.Signal()