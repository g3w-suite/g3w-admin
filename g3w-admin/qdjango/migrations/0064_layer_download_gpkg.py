# Generated by Django 2.2.16 on 2021-01-12 14:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('qdjango', '0063_auto_20210111_0726'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='download_gpkg',
            field=models.BooleanField(blank=True, default=False, verbose_name='Download data in gpkg format'),
        ),
    ]
