import django.dispatch

# Load data fro qdjango widget form
# pass context template form
load_qdjango_widgets_data = django.dispatch.Signal(providing_args=['context'])