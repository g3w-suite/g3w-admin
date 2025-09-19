# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-09-19 10:16:52'
__copyright__ = 'Copyright Gis3w'

from mozilla_django_oidc.auth import OIDCAuthenticationBackend

class G3WOIDCAB(OIDCAuthenticationBackend):
    def verify_claims(self, claims):
        verified = super().verify_claims(claims)

        return verified

        # is_admin = 'admin' in claims.get('group', [])

        # return verified and is_admin
