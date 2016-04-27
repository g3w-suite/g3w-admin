import django.dispatch

# signal for start plugin: i.e. iternet
initconfig_plugin_start = django.dispatch.Signal(providing_args=["projectType", "project"])

# signals pre update project
pre_update_project = django.dispatch.Signal(providing_args=["projectType", "project"])

# signals pre delet project
pre_delete_project = django.dispatch.Signal(providing_args=["projectType", "project", "projects"])