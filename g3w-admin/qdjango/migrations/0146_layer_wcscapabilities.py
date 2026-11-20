from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('qdjango', '0117_auto_20240308_0728'),
        ('qdjango', '0145_merge_0141_project_srid_0144_layer_wmts_format'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='wcscapabilities',
            field=models.BooleanField(blank=True, null=True, verbose_name='WCS capabilities'),
        ),
    ]
