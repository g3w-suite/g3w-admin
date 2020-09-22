

def get_qplotlywidget_for_project(project):
    """Get a list of QplotlyWidget instance for given Project instance"""

    qplotly_widgets = []

    for layer in project.layer_set.all():

        for widget in layer.qplotlywidget_set.all():
            qplotly_widgets.append(widget)

    return qplotly_widgets
