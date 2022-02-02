import django.dispatch

# Load data from qdjango widget form
# pass context template form
load_qdjango_widgets_data = django.dispatch.Signal(providing_args=['context'])

# load widgets data on layer serializzation
load_qdjango_widget_layer = django.dispatch.Signal(providing_args=['layer', 'ret', 'widget'])

# load project file
load_qdjango_project_file = django.dispatch.Signal(providing_args=['qgis_project'])

# post save project file
post_save_qdjango_project_file = django.dispatch.Signal(providing_args=['qgis_project'])

# using/reading layer model instace
# invoke this signals for get data from no core module
reading_layer_model = django.dispatch.Signal()
