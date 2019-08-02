import django.dispatch

# Load data from qdjango widget form
# pass context template form
load_qdjango_widgets_data = django.dispatch.Signal(providing_args=['context'])

# load widgets data on layer serializzation
load_qdjango_widget_layer = django.dispatch.Signal(providing_args=['layer', 'ret', 'widget'])