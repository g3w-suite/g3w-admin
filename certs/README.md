# SSL
This openssl certs can be used for run https in development enviroiment.

## Runserver with ssl

### 'runserver_plus' (django-extensions) case:
```bash
./manage.py runserver_plus --cert-file ../certs/cert.pem --key-file ../certs/key.pem 0.0.0.0:8000
```

