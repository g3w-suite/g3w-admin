# Generated by Django 2.2.23 on 2021-08-06 07:21

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0072_auto_20210708_0749'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='group',
            name='lang',
        ),
    ]
