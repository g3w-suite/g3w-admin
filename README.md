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
To create a virtualnev is sufficent call mkvirtualenv commando follow by the identification name for virtualenv
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
    libgdal-dev
```

after is necessary install the correct python module for GDAL library, check your version and install correct module

```bash
pip install GDAL==<installed_version or closest>
```

### With paver commands

G3W-ADMIN has a series of [paver](http://pythonhosted.org/Paver/) commands to administrate the suite.
After prepared environment if sufficient invoce paver *install* task

```bash
paver install
```



