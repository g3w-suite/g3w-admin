# AUTHLDAP CONF
#===============================

import ldap
from django_auth_ldap.config import ActiveDirectoryGroupType, LDAPGroupQuery, LDAPSearch

ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
AUTH_LDAP_SERVER_URI = "ldaps://dc1 ldaps://dc2"

# Auth by sAMAccountName
AUTH_LDAP_USER_DN_TEMPLATE = "%(user)s@ucrls.local"

AUTH_LDAP_GROUP_TYPE = ActiveDirectoryGroupType(name_attr="CN")

# Bind with user authenticated for AD
AUTH_LDAP_BIND_AS_AUTHENTICATING_USER = True

AUTH_LDAP_CONNECTION_OPTIONS = {
    ldap.OPT_REFERRALS: 0
}

AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
    "OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local", ldap.SCOPE_SUBTREE, "(objectClass=group)"
)

AUTH_LDAP_REQUIRE_GROUP = (
    LDAPGroupQuery('CN=ucrls_g3w_admin_L1,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local')
    | LDAPGroupQuery('CN=ucrls_g3w_admin_L2,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local')
    | LDAPGroupQuery('CN=ucrls_g3w_editor_L1,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local')
    | LDAPGroupQuery('CN=ucrls_g3w_editor_L2,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local')
    | LDAPGroupQuery('CN=ucrls_g3w_viewer_L1,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local')
)

AUTH_LDAP_GROUP_MAP = {
    'CN=ucrls_g3w_admin_L1,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local': 'Admin Level 1',
    'CN=ucrls_g3w_admin_L2,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local': 'Admin Level 2',
    'CN=ucrls_g3w_editor_L1,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local': 'Editor Level 1',
    'CN=ucrls_g3w_editor_L2,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local': 'Editor Level 2',
    'CN=ucrls_g3w_viewer_L1,OU=sit_gis,OU=Gruppi,OU=Unione,OU=UCRLS,DC=ucrls,DC=local': 'Viewer Level 1'
}

AUTH_LDAP_USER_ATTR_MAP = {
    "first_name": "givenName",
    "last_name": "sn",
    "email": "mail"
}


AUTHENTICATION_BACKENDS = (
        'authldap.backend.G3WLDAPBackend',
        'django.contrib.auth.backends.ModelBackend',
        'guardian.backends.ObjectPermissionBackend'
)
