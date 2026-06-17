from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0095_generalsuitedata_about_description_es_and_more'),
    ]

    operations = [
        TrigramExtension(),
    ]
