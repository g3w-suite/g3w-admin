# coding=utf-8
"""" Usermanage receivers module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = "lorenzetti@gis3w.it"
__date__ = "2023-09-14"
__copyright__ = "Copyright 2015 - 2023, Gis3w"
__license__ = "MPL 2.0"

from django.conf import settings
from django.dispatch import receiver
from django_registration.signals import user_registered
from usersmanage.models import Userbackend, USER_BACKEND_DEFAULT, Group as AuthGroup, Userdata
from usersmanage.configs import G3W_VIEWER1
import logging

logger = logging.getLogger('django.request')

@receiver(user_registered)
def set_user_backend(sender, **kwargs):
    """
    Set User-backend on registration
    """

    # Set default g3w-suite backend
    user = kwargs['user']
    Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()
    logger.info(f"Assigned backend {USER_BACKEND_DEFAULT} to registered user {user}")

    # If set save `Other information`

    if hasattr(user, "userdata"):
            user.userdata.other_info = kwargs["request"].POST["other_info"]
            user.userdata.registered = True
            user.userdata.save()
    else:
        Userdata(
            user=user,
            registered=True,
            other_info=kwargs["request"].POST["other_info"]
        ).save()

    # Set default registration role
    if hasattr(settings, 'REGISTRATION_MAIN_ROLES'):
        for role in settings.REGISTRATION_MAIN_ROLES:
            AuthGroup.objects.get(name=role).user_set.add(kwargs["user"])
    else:

        # By default, add user to Viewer Level 1 group
        AuthGroup.objects.get(name=G3W_VIEWER1).user_set.add(kwargs['user'])

