from django.apps import AppConfig
from django.conf import settings
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
