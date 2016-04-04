import django.dispatch

initconfig_plugin_start = django.dispatch.Signal(providing_args=["projectType", "project"])