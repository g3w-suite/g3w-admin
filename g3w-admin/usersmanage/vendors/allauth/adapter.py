# coding=utf-8
""""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2024-12-17'
__copyright__ = 'Copyright 2015 - 2024, Gis3w'
__license__ = 'MPL 2.0'

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.models import EmailAddress
from usersmanage.models import User, Group as AuthGroup, Userbackend, USER_BACKEND_DEFAULT
from usersmanage.configs import G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1

class G3WSocialAccountAdapter(DefaultSocialAccountAdapter):

    def _set_user_role_backend(self, user):
        """
        Set the role and the backend for the user login by social
        """

        # Role to se from settings
        role = settings.SOCIALACCOUNT_USER_ROLE \
            if settings.SOCIALACCOUNT_USER_ROLE in (G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1) else G3W_VIEWER1

        AuthGroup.objects.get(name=role).user_set.add(user)

        # Backend
        if not hasattr(user, 'userbackend'):
            Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()

    def pre_social_login(self, request, sociallogin):

        # Social account already exists, so this is just a login
        if sociallogin.is_existing:
            return

        # some social logins don't have an email address
        if not sociallogin.email_addresses:
            return
        try:
            existing_user = User.objects.get(email=sociallogin.email_addresses[0].email)
            self._set_user_role_backend(existing_user)
        except ObjectDoesNotExist:
            return

        # if it does, connect this new social login to the existing user
        sociallogin.connect(request, existing_user)

    def save_user(self, request, sociallogin, form=None):
        user = super(G3WSocialAccountAdapter, self).save_user(request, sociallogin, form=form)
        self._set_user_role_backend(user)
        return user