import django.dispatch

# signal for start plugin: i.e. iternet
initconfig_plugin_start = django.dispatch.Signal(providing_args=["projectType", "project"])

# signal to add extra maplayers attribute: i.e. iternet
post_create_maplayerattributes = django.dispatch.Signal(providing_args=["layer"])

# signals pre update project
pre_update_project = django.dispatch.Signal(providing_args=["projectType", "project"])

# signals pre delet project
pre_delete_project = django.dispatch.Signal(providing_args=["projectType", "project", "projects"])