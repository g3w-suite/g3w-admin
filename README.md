![G3W-Suite CI Tests](https://github.com/g3w-suite/g3w-admin/actions/workflows/test_runner.yml/badge.svg)
[![License](https://img.shields.io/badge/license-MPL%202-blue.svg?style=flat)](LICENSE)

# G3W-ADMIN

Admin server for G3W-SUITE written in Python, based on **Django** LTS (v4.2) and **QGIS Server** LTR (v3.40)

![Admin GUI](https://user-images.githubusercontent.com/9614886/189155796-6feff629-b500-4e38-b7c2-d98b53ae7564.png)

---

## Versions and Branches

Software releases follow theese main branches as described in the compatibility table:

| Branch     | Python | Django         | QGIS          | [client]     | First release | Status         |
|------------|--------|----------------|---------------|--------------|---------------|----------------|
| [dev]      | 3.12   | 4.2            | 3.40          | dev          | Unreleased    | ⚠️️ Unstable    |
| [v.3.10.x] | 3.12   | 4.2            | 3.40          | 4.0.0        | Aug 2025      | New release    |
| [v.3.9.x]  | 3.12   | 4.2            | 3.34          | 3.11.0       | Jan 2025      | 🪲️ Bug fixing  |
| [v.3.8.x]  | 3.10   | 3.2            | 3.34          | 3.10.3       | Sep 2024      | 🪲️ Bug fixing  |
| [v.3.7.x]  | 3.10   | 3.2            | 3.34          | 3.9.6        | Dec 2023      | 🚨 End of Life |
| [v.3.6.x]  | 3.10   | 3.2            | 3.28          | 3.8.15       | May 2023      | 🚨 End of Life |
| [v.3.5.x]  | 3.10   | 2.2            | 3.22          | 3.7          | Nov 2022      | 🚨 End of Life |
| [v.3.4.x]  | 3.8    | 2.2            | 3.22          | 3.4          | Mar 2022      | 🚨 End of Life |
| [v.3.3.x]  | 3.6    | 2.2            | 3.16          | 3.3          | Sep 2021      | 🚨 End of Life | 
| [v.3.2.x]  | 3.6    | 2.2            | 3.16          | 3.2          | Apr 2021      | 🚨 End of Life |
| [v.3.1.x]  | 3.6    | 2.2            | 3.10          | 3.1          | Nov 2020      | 🚨 End of Life |
| [v.3.0.x]  | 3.6    | 2.2            | 3.10          | 3.0          | Nov 2020      | 🚨 End of Life |
| [dj22-py3] | 3.6    | 2.2            | [🔗]          |              |               | 🚨 End of Life |
| [py2]      | 2.7    | 1.11           | [🔗]          |              |               | 🚨 End of Life |


[dev]: https://github.com/g3w-suite/g3w-admin/tree/dev
[v.3.10.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.10.x
[v.3.9.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.9.x
[v.3.8.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.8.x
[v.3.7.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.7.x
[v.3.6.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.6.x
[v.3.5.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.5.x
[v.3.4.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.4.x
[v.3.3.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.3.x
[v.3.2.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.2.x
[v.3.1.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.1.x
[v.3.0.x]: https://github.com/g3w-suite/g3w-admin/tree/v.3.0.x
[dj22-py3]: https://github.com/g3w-suite/g3w-admin/tree/dj22-py3
[py2]: https://github.com/g3w-suite/g3w-admin/tree/py2
[🔗]: https://github.com/g3w-suite/g3w-suite-docker/issues/25
[client]: https://github.com/g3w-suite/g3w-client

---

## Project setup

### Docker Compose

It's strongly recommended to follow the [**g3w-suite-docker**](https://github.com/g3w-suite/g3w-suite-docker) installation instructions (which already bundles a full blown NGINX + PostgreSQL setup), as such installation method speed up development and deployment and would cause you fewer issues in terms of compatibility and portability in the short and long term.

### Barebone server

If you will opt for the [**raw installation**](https://g3w-suite.readthedocs.io/en/latest/install.html#raw-installation) you will need to configure your own web server in order to run a Django project, some common setups are:

* [Apache + mod_wsgi](https://docs.djangoproject.com/en/2.2/howto/deployment/wsgi/modwsgi/)
* [Apache](https://httpd.apache.org/) + [mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html) + [Uwsgi](https://uwsgi-docs.readthedocs.io/en/latest/)
* [Apache](https://httpd.apache.org/) + [mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html) + [Gunicorn](http://gunicorn.org/)
* [Nginx](https://nginx.org/) + [Uwsgi](https://uwsgi-docs.readthedocs.io/en/latest/)
* [Nginx](https://nginx.org/) + [Gunicorn](http://gunicorn.org/)

To figure out which to choose, see also: [deploying django](https://docs.djangoproject.com/en/2.2/howto/deployment/)

Then in your development environment:

1. download and install [**Node.js**](https://nodejs.org/en/download/) and [**Yarn**](https://yarnpkg.com/en/docs/install)
2. get a [**Python**](https://www.python.org/downloads/) version that is compatible with the [table](#versions-and-branches) above
3. install and activate a [**database**](https://docs.djangoproject.com/en/2.2/ref/databases/) that fits your needs
4. (optional) install [**Paver**](https://pythonhosted.org/Paver/#installation) for developing locally

##### For Ubuntu 24.04

Installa *nvm* for install node at version 8.x:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Installa Node.js 8.x
nvm install 8.17.0
nvm use 8.17.0

# Installa Gulp
npm install -g gulp-cli@2.3.0
```


After that you can clone this repository:

```sh
cd /path/to/your/development/workspace

git clone https://github.com/g3w-suite/g3w-admin.git --single-branch --branch dev ./g3w-admin
```

Create and activate [**virtualenv**](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/#creating-a-virtual-environment) within your g3w-admin local repository:

```sh
cd ./g3w-admin

python3 -m venv --system-site-packages [--prompt g3w-admin] venv
```

```sh
# Linux / Mac OS
source venv/bin/activate

# Windows
.\venv\Scripts\activate
```

Create the following configuration file from the available template:

- `/g3w-admin/g3w-admin/base/settings/local_settings.py` ← [local_settings_example.py](g3w-admin/base/settings/local_settings_example.py)

And check that the following parameters are set accordingly:

```py
# /g3w-admin/g3w-admin/base/settings/local_settings.py

DATASOURCE_PATH     = '<static_path_to_gis_data_source>'
MEDIA_ROOT          = '<path_to_media_root>'
SESSION_COOKIE_NAME = '<unique_session_id>'
DATABASES           = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': '<db_name>',
        'USER': '<db_user>',
        'PASSWORD': '<db_user_password>',
        'HOST': '<db_host>',
        'PORT': '<db_port>',
    }
}
```

Complete installation process by download all python and javascript dependencies and finalizing the django database setup:

```sh
paver install
```

If you don't want to use Paver, see also: [manual installation steps](https://g3w-suite.readthedocs.io/en/latest/install.html#manual-installation-steps)

---

## How to develop

You can start the built-in development server by using the following:

```sh
paver start
```

```sh
paver stop
```

If everything went fine, you can now visit your local development server URL to see changes:

```sh
http://localhost:8000
```

If you don't want to use Paver, see also: [run g3w-suite](https://g3w-suite.readthedocs.io/en/latest/install.html#run-g3w-suite)

---

## Plugins

Add-on modules are released according to django's python specifications on [reusable apps](https://docs.djangoproject.com/en/2.2/intro/reusable-apps/).

The following packages are released as core applications:

- [caching](./g3w-admin/caching)
- [editing](./g3w-admin/editing)
- [filemanager](./g3w-admin/filemanager)
- [openrouteservice](./g3w-admin/openrouteservice)
- [OWS](./g3w-admin/OWS)
- [qdjango](./g3w-admin/qdjango)
- [qplotly](./g3w-admin/qplotly)
- [qtimeseries](./g3w-admin/qtimeseries)
- [usersmanage](./g3w-admin/usersmanage)

Any additional package must be placed into the [`/g3w-admin/g3w-admin`](./g3w-admin) folder.

---

## Testing

Automated tests are performed on both latest QGIS release and current QGIS LTR (v3.34) for any push event involving the [`dev`](https://github.com/g3w-suite/g3w-admin/tree/dev) branch.

The Dockerfile and docker-compose.yml files used to perform these tests are:

- [Dockerfile.deps](ci_scripts/Dockerfile.deps) + [docker-compose.yml](docker-compose.yml) → latest QGIS release
- [Dockerfile.ltr.deps](ci_scripts/Dockerfile.ltr.deps) + [docker-compose.ltr.yml](docker-compose.ltr.yml) → current QGIS LTR (v3.34)

Execution log: [github.com/g3w-suite/g3w-admin/actions](https://github.com/g3w-suite/g3w-admin/actions)

More info: [test_runner.yml](./.github/workflows/test_runner.yml) + [build_suite.sh](./ci_scripts/build_suite.sh)

---

## FAQ

<details>

<summary>1. How can I translate this project?</summary>

Translations management is a part of the Django framework, all available translations are located in the [/g3w-admin/locale](./g3w-admin/locale) folder.

Depending on the component you want to translate you can start by consulting one of the following:

- [how to create language files?](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#localization-how-to-create-language-files)
- [translating Python](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#internationalization-in-python-code)
- [translating Templates](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#internationalization-in-template-code)
- [translating Javascript](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#internationalization-in-javascript-code)
- [translating URLs](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#module-django.conf.urls.i18n)
- [implementation notes](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#implementation-notes) and [miscellaneous](https://docs.djangoproject.com/en/2.2/topics/i18n/translation/#miscellaneous)

</details>

---

### Contributors

* GIS3W: [wlorenzetti](https://github.com/wlorenzetti), [leolami](https://github.com/leolami/), [volterra79](https://github.com/volterra79), [raruto](https://github.com/Raruto), [giohappy](https://github.com/giohappy)
* QCooperative: [elpaso](https://github.com/elpaso), [luipir](https://github.com/luipir)
* Kartoza: [NyakudyaA](https://github.com/NyakudyaA)

### Translators

* Romanian: [tudorbarascu](https://github.com/tudorbarascu)
* German: [r3gis](https://www.r3gis.com)
* French: [democracy essentials](https://www.democracy-essentials.eu)
* Bulgarian: [Ivan Ivanov (suricactus)](https://github.com/suricactus)

---

**Compatibile with:**
[![Django version](https://img.shields.io/badge/Django-3.2-1EB300.svg?style=flat)](https://www.djangoproject.com/download/)
[![QGIS version](https://img.shields.io/badge/QGIS%20LTR-3.34-1EB300.svg?style=flat)](https://www.qgis.org/en/site/forusers/download.html)

---

**License:** MPL-2
