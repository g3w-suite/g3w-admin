#!/bin/bash

set -e

DATASOURCE_PATH='/shared-volume/project_data'
MEDIA_ROOT='/shared-volume/media'
PROJECTS_DIR="${MEDIA_ROOT}/projects"

if [ ! -e "setup_done" ]; then
    echo "Setup started for G3W-Suite installation ..."
    echo "Copying docker_settings.py to /base/settings/local_settings.py"
    cp ./settings_docker.py ./g3w-admin/base/settings/local_settings.py

    echo "Building javascript code ..."
    yarn --ignore-engines --ignore-scripts --prod
    nodejs -e "try { require('fs').symlinkSync(require('path').resolve('node_modules/@bower_components'), 'g3w-admin/core/static/bower_components', 'junction') } catch (e) { }"

    echo "Cleaning up some dirs before collecting statics ..."
    rm -rf static
    rm -rf ${MEDIA_ROOT}
    mkdir ${MEDIA_ROOT}
    ln -s ${MEDIA_ROOT} static

    pushd .
    echo "Creating projects(_data) directores in ${PROJECTS_DIR} ..."
    cd media
    ls ${PROJECTS_DIR} || mkdir ${PROJECTS_DIR}
    ls ${DATASOURCE_PATH} || mkdir ${DATASOURCE_PATH}
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

    echo "Installing fixtures ..."
    for FIXTURE in 'BaseLayer.json' 'G3WGeneralDataSuite.json' 'G3WMapControls.json' 'G3WSpatialRefSys.json'; do
        python manage.py loaddata  core/fixtures/${FIXTURE}
    done
    # sync menu tree items
    python manage.py sitetree_resync_apps
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
