from django.apps import AppConfig
from django.conf import settings

class UserScriptsConfig(AppConfig):
    name = 'userscripts'
    verbose_name = 'User Scripts'

    settings.MIDDLEWARE = settings.MIDDLEWARE + [ 'userscripts.middleware.UserScriptsMiddleware' ]