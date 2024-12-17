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
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site
from usersmanage.models import Userbackend, USER_BACKEND_DEFAULT, Group as AuthGroup, Userdata
from usersmanage.configs import G3W_VIEWER1
from usersmanage.signals import after_save_user_form
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


@receiver(after_save_user_form)
def send_email_to_user(sender, **kwargs):
    """
    Check if user is activated by administrator and send an email
    of  `activation confirmation`
    """

    user = kwargs['user']

    if (not hasattr(user, 'userdata') or
            not sender.request.user.is_superuser or
            user.userdata.registered == False or
            user.userdata.activated_by_admin):
        return

    # Set activated by user
    if user.is_active:
        user.userdata.activated_by_admin = True
        user.userdata.save()

    # Send email to user
    # ----------------------------------------------------------
    scheme = "https" if hasattr(sender.request, 'is_secure') and sender.request.is_secure() else "http"
    try:
        site = get_current_site(sender.request)
    except:
        site = 'localhost'

    context =  {
        "scheme": scheme,
        "site": site,
        "user": user
    }
    subject = render_to_string(
        template_name='django_registration/activated_by_admin_email_subject.txt',
        context=context,
        request=sender.request,
    )
    # Force subject to a single line to avoid header-injection
    # issues.
    subject = "".join(subject.splitlines())
    message = render_to_string(
        template_name='django_registration/activated_by_admin_email_body.txt',
        context=context,
        request=sender.request,
    )

    user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, fail_silently=True)


