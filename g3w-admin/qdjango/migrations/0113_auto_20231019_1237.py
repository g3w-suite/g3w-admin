# Generated by Django 3.2.20 on 2023-10-19 12:37

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('qdjango', '0112_auto_20231017_0752'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filterlayersaved',
            name='name',
            field=models.TextField(null=True),
        ),
        migrations.AlterUniqueTogether(
            name='filterlayersaved',
            unique_together={('user', 'layer', 'name')},
        ),
    ]