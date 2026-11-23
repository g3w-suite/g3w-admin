from defusedxml import ElementTree
from django.db import migrations


def populate_wcs_capabilities(apps, schema_editor):
    database = schema_editor.connection.alias
    Project = apps.get_model('qdjango', 'Project')
    Layer = apps.get_model('qdjango', 'Layer')
    unknown_layers = Layer.objects.using(database).filter(wcscapabilities__isnull=True)
    projects = Project.objects.using(database).filter(pk__in=unknown_layers.values('project_id'))

    for project in projects.iterator():
        with project.qgis_file.open('rb') as project_file:
            root = ElementTree.parse(project_file).getroot()
        layer_ids = [
            value.text for value in root.findall('./properties/WCSLayers/value')
        ]
        layers = unknown_layers.filter(project_id=project.pk)
        layers.filter(qgs_layer_id__in=layer_ids).update(wcscapabilities=True)
        layers.exclude(qgs_layer_id__in=layer_ids).update(wcscapabilities=False)


class Migration(migrations.Migration):

    dependencies = [
        ('qdjango', '0146_layer_wcscapabilities'),
    ]

    operations = [
        migrations.RunPython(populate_wcs_capabilities, migrations.RunPython.noop),
    ]
