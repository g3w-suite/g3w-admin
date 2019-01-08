# Simple APP for SPID login

This is not a complete SPID implementation but a simple 
app to add a redirect link to the login dialog and 
to hijack the return call form the IdP that would 
contain the headers required for authentication.

Upon a successful authentication a the user will be
created if necessary and logged in.

WARNING: THIS IS COMPLETELY INSECURE BECAUSE THE REDIRECT
IS NOT VALIDATED IN ANY WAY (NO SIGNATURE OR CERTIFICATES
VALIDATION)

## Components

+ settings (merged with `django.conf.settings`)
+ middleware that intercepts the redirect and logs the user in
+ template to create the SPID login link (that looks like a button)

## Settings

Default values as in file `spid_settings.py`:

```python
SPID_ENABLED = True
SPID_REDIRECT_BASE_URL = 'https://egov.ba.it/shibboleth-discovery-service/WAYF?entityID=https://www.comune.bari.it/sp&return='
# Maps SPID attributes coming from the authenticaion redirect to Django User model fields,
# username is mandatory and must be unique:
SPID_ATTRIBUTE_MAP = {
    'spidCode': 'username',  # <- username is mandatory!
    'email': 'email',
    'familyName': 'last_name',
    'name': 'first_name',
}
```

