from django.apps import AppConfig
from django.conf import settings
from django.db.models.signals import post_migrate
from django.db import connections
import os

sqlFiles = (
    'trig_insert_update_accesso.sql',
    'trig_delete_elemento_stradale.sql',
    'trig_delete_civici.sql',
    'trig_delete_accesso.sql'
)


def addTriggerTablesFunction(sender, **kwargs):

    if kwargs['using'] != settings.ITERNET_DATABASE:
        return

    cursor = connections[settings.ITERNET_DATABASE].cursor()

    try:
        for sqlFile in sqlFiles:
            file = open("{}/sql/{}".format(os.path.dirname(os.path.abspath(__file__)), sqlFile), "r")
            sql = file.read()
            file.close()
            cursor.execute(sql)
    finally:
        cursor.close()

class iternetConfig(AppConfig):

    name = 'iternet'
    verbose_name = 'Iternet'

    def ready(self):

        # import signal handlers
        import iternet.receivers

        # add postmigrate receivers for table triggers
        post_migrate.connect(addTriggerTablesFunction, sender=self)