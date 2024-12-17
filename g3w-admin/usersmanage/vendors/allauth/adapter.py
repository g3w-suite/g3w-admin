# coding=utf-8
""""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2024-12-17'
__copyright__ = 'Copyright 2015 - 2024, Gis3w'
__license__ = 'MPL 2.0'

from django.core.exceptions import ObjectDoesNotExist
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.models import EmailAddress
from usersmanage.models import User, Group as AuthGroup
from usersmanage.configs import G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1

class G3WSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):

        # social account already exists, so this is just a login
        if sociallogin.is_existing:
            return

        # some social logins don't have an email address
        if not sociallogin.email_addresses:
            return
        try:
            print('pass')
            existing_user = User.objects.get(email=sociallogin.email_addresses[0].email)

            AuthGroup.objects.get(name=G3W_VIEWER1).user_set.add(existing_user)
            #todo: se non hai ruoli aggiungere il ruolo di defauul, backend!!!!!!!
            # controllare che ci sia almeno un gruppo
        except ObjectDoesNotExist:
            print('non esiste')
            return

        # if it does, connect this new social login to the existing user
        sociallogin.connect(request, existing_user)

    def save_user(self, request, sociallogin, form=None):
        user = super(G3WSocialAccountAdapter, self).save_user(request, sociallogin, form=form)
        AuthGroup.objects.get(name=G3W_VIEWER1).user_set.add(user)
        #todo: aggiungere ruolo
        return user