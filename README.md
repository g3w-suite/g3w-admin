# G3W-SUITE

G3W-ADMIN admin server module for G3W-SUITE.

The following instructions are for a Ubuntu 16.04 LTS.

## Installation of node.js and Bower
G3W-ADMIN use javacript package manager [**bower**](https://bower.io/)

Bower works on [**Node.js**](https://nodejs.org/it/)

```bash
sudo apt-get install -y nodejs-legacy npm
```

after with 'npm' install bower

```bash
sudo npm install -g bower
```

## Create virtualenv

[**Virtualenv**](https://virtualenv.pypa.io/en/stable/)

The following instructions are for python 2

Install python pip

```bash
sudo apt-get install python-pip
```

now we can install virtualenvwrapper
```bash
sudo pip install virtualenvwrapper
```

To activate virtuenvwrapper on system login, add follow lines to 'bashrc' config file of your user
```bash
nano ~/.bashrc
....
export WORKON_HOME=<path_to_virtualenvs_directory>
source /usr/local/bin/virtualenvwrapper.sh
```

## Virtualenv creation
To create a virtualnenv is sufficent call mkvirtualenv commando follow by the identification name for virtualenv
```bash
mkvirtualenv g3wsuite
```

## Install G3W-SUITE

First step is install dev libraries packages for python module to install with requiriments.txt

```bash
sudo apt-get install -y \
    libxml2-dev \
    libxslt-dev \
    postgresql-server-dev-all \
    libgdal-dev \
    python-dev
```

after is necessary install the correct python module for GDAL library, check your version and install correct module

```bash
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal

pip install GDAL==<installed_version or closest>
```

### Set local_config.py file
G3W-ADMIN is a Django application, and to work is necessary set a config.py file. To start copy local_settings.example.py and set the databse and other:
```bash
cd g3w-admin/g3w-admin/base/settings
cp local_settings_example.py local_settings.py
```

set database, media root and session cookies name:

```python
...

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': '<db_name>',
        'USER': '<db_user>',
        'PASSWORD': '<db_user_password>',
        'HOST': '<db_host>',
        'PORT': '<db_port>',
    }
}

...

DATASOURCE_PATH = '<static_path_to_gis_data_source>'

...

MEDIA_ROOT = '<path_to_media_root>'

...

SESSION_COOKIE_NAME = '<unique_session_id>'
```

### With paver commands

G3W-ADMIN has a series of [paver](http://pythonhosted.org/Paver/) commands to administrate the suite.
After prepared environment if sufficient invoce paver *install* task

```bash
paver install
```

To run the application with paver

```bash
paver start
```

and for stop
```bash
paver start
```


G3W-ADMIN is a django application so is possibile run app by standard django manage.py commands

```bash
./manage.py runserver
```





