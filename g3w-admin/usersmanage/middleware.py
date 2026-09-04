# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-10-02 14:54:13'
__copyright__ = 'Copyright Gis3w'


from django.conf import settings
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.backends import TokenBackend
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import AccessToken

class JWTAutologinMiddleware(MiddlewareMixin):
    def process_request(self, request):
        token = request.GET.get("token") or request.headers.get("Authorization")
        if not token:
            return  # no token, the request continues normally

        # if the token is provided as 'Bearer <token>'
        if token.startswith("Bearer "):
            token = token[7:]

        try:
            validate_token = AccessToken(token)
            user_id = validate_token.get("user_id")

            if user_id:
                user = User.objects.get(pk=user_id)
                for backend in settings.AUTHENTICATION_BACKENDS:
                    user.backend = backend
                    login(request, user)
        except (InvalidToken, TokenError, User.DoesNotExist):
            pass  # invalid token, request continues anonymously