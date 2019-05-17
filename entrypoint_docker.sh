#!/bin/bash

set -e

if [ ! -e "setup_done" ]; then
    echo "Setup started for G3W-Suite installation ..."
    echo "Copying docker_settings.py to /base/settings/local_settings.py"
    cp ./settings_docker.py ./g3w-admin/base/settings/local_settings.py

    echo "Building javascript code ..."
    yarn --ignore-engines --ignore-scripts --prod
    nodejs -e "try { require('fs').symlinkSync(require('path').resolve('node_modules/@bower_components'), 'g3w-admin/core/static/bower_components', 'junction') } catch (e) { }"

    echo "Cleaning up some dirs before collecting statics ..."
    rm -rf static
    mkdir static
    rm -rf media
    ln -s static media

    pushd .
    echo "Creating project directory in /shared-volume/projects"
    cd media
    ls /shared-volume/projects || mkdir /shared-volume/projects
    ln -s /shared-volume/projects projects
    popd

    pushd .
    cd g3w-admin/core/static
    rm -rf bower_components
    ln -s "/code/node_modules/@bower_components" bower_components
    popd

    # Wait for postgis here so we avoid waiting while building js code
    wait-for-it -h postgis -p 5432 -t 60

    cd g3w-admin
    python manage.py collectstatic --noinput
    python manage.py migrate --noinput
    python manage.py createsuperuser --noinput --username admin --email admin@email.com || true
    python manage.py set_fake_passwords --password admin
    touch "setup_done"
    echo "Setup completed ..."
else
    echo "Setup was already done, skipping ..."
    # Wait for postgis
    wait-for-it -h postgis -p 5432 -t 60
fi

echo "Starting Django server ..."
python manage.py runserver 0.0.0.0:8000
