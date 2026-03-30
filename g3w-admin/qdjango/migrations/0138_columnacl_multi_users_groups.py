# Generated migration for ColumnAcl multi users/groups support

from django.conf import settings
from django.db import migrations, models


def migrate_fk_to_m2m(apps, schema_editor):
    """Copy existing user/group FK data to the new M2M fields."""
    ColumnAcl = apps.get_model('qdjango', 'ColumnAcl')
    for acl in ColumnAcl.objects.all():
        if acl.user_id:
            acl.users.add(acl.user_id)
        if acl.group_id:
            acl.groups.add(acl.group_id)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('auth', '0011_update_proxy_permissions'),
        ('qdjango', '0137_alter_project_autozoom_query_and_more'),
    ]

    operations = [
        # 1. Remove existing check constraints
        migrations.RemoveConstraint(
            model_name='columnacl',
            name='user_or_group_mutex_column',
        ),
        migrations.RemoveConstraint(
            model_name='columnacl',
            name='user_or_group_is_set_column',
        ),
        # 2. Add new M2M fields
        migrations.AddField(
            model_name='columnacl',
            name='users',
            field=models.ManyToManyField(
                blank=True,
                related_name='column_acl_restrictions',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Users',
            ),
        ),
        migrations.AddField(
            model_name='columnacl',
            name='groups',
            field=models.ManyToManyField(
                blank=True,
                related_name='column_acl_restrictions',
                to='auth.Group',
                verbose_name='User groups',
            ),
        ),
        # 3. Migrate FK data to M2M
        migrations.RunPython(migrate_fk_to_m2m, migrations.RunPython.noop),
        # 4. Remove old FK fields
        migrations.RemoveField(
            model_name='columnacl',
            name='user',
        ),
        migrations.RemoveField(
            model_name='columnacl',
            name='group',
        ),
    ]
