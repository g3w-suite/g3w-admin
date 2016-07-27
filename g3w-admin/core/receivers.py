from .models import GroupProjectPanoramic


def check_overviewmap_project(sender, **kwargs):

    project_type = sender._meta.app_label
    project = kwargs['instance']

    try:
        group_project_panoramics = GroupProjectPanoramic.objects.get(group_id=project.group.id,
                                                                     project_type=project_type, project_id=project.id)
        group_project_panoramics.delete()
    except Exception:
        pass
