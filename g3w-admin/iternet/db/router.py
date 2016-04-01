from django.conf import settings


class IternetRouter(object):
    """
    A router to control all database operations on models in the
    auth application.
    """
    def db_for_read(self, model, **hints):
        """
        Attempts to read auth models go to internet.
        """
        if model._meta.app_label == 'iternet':
            if model._meta.model_name == 'config':
                return None
            return settings.ITERNET_DATABASE
        return None

    def db_for_write(self, model, **hints):
        """
        Attempts to write auth models go to iternet.
        """
        if model._meta.app_label == 'iternet':
            if model._meta.model_name == 'config':
                return None
            return settings.ITERNET_DATABASE
        return None

    def allow_relation(self, obj1, obj2, **hints):
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == 'default' and app_label == 'iternet':
            if model_name == 'config':
                return None
            return False
        elif db == settings.ITERNET_DATABASE and app_label != 'iternet':
            return False
        return None
