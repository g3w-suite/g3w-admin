# Generated by Django 2.2.16 on 2021-03-09 14:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0069_auto_20210225_0754'),
    ]

    operations = [
        migrations.AddField(
            model_name='group',
            name='use_logo_client',
            field=models.BooleanField(default=False, help_text='As for MacroGroup options is possible to use current logo group as client logo, if MacroGroup option is active this options takes precendence', verbose_name='Use logo image for client'),
        ),
        migrations.AddField(
            model_name='group',
            name='use_title_client',
            field=models.BooleanField(default=False, help_text='As for MacroGroup options is possible to use current title group as client title, if MacroGroup option is active this options takes precendence', verbose_name='Use title for client'),
        ),
    ]
