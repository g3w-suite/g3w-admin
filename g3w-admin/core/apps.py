from django.apps import AppConfig
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import os
import shutil

class CoreConfig(AppConfig):
    name = 'core'
    verbose_name = 'G3W-Admin main app'

    # For default Group logo image
    # -----------------------------------------------------------------
    f = settings.CLIENT_G3WSUITE_LOGO
    frm = f"{os.path.dirname(__file__)}/static/img/{f}"
    dst = f"{settings.MEDIA_ROOT}logo_img/"

    if not os.path.exists(f"{dst}{f}"):
        # Before check if directory `logo_img` exists
        if not os.path.exists(dst):
            os.mkdir(dst)
        shutil.copy(frm, dst)

    # Check custom settings
    # ------------------------------------------------------------------

    # RECAPTCHA
    if settings.RECAPTCHA:
        available_recaptcha_versions = ["2", "3"]
        if hasattr(settings, 'RECAPTCHA_VERSION') and settings.RECAPTCHA_VERSION not in available_recaptcha_versions:
            raise ImproperlyConfigured(
                f"RECAPTCHA_VERSION setting must be of: {', '.join(available_recaptcha_versions)}.")

        available_recaptcha_version2_types = ['checkbox', 'invisible']
        if (hasattr(settings, 'RECAPTCHA_VERSION2_TYPE') and
                settings.RECAPTCHA_VERSION2_TYPE not in available_recaptcha_version2_types):
            raise ImproperlyConfigured(
                f"RECAPTCHA_VERSION2_TYPE setting must be of: {', '.join(available_recaptcha_version2_types)}.")
