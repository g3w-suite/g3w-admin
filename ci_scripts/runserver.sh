#!/bin/bash

rm /tmp/.X99-lock
Xvfb :99 -screen 0 640x480x24 -nolisten tcp &
export DISPLAY=:99
export QGIS_SERVER_PARALLEL_RENDERING=1

source /usr/local/bin/virtualenvwrapper.sh
workon g3w-suite

python3 /code/g3w-admin/manage.py runserver 0.0.0.0:8008