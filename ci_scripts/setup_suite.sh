#!/bin/bash
#
# Setup script for g3w-suite, to be run inside the docker container
#
# Depending on the existence of "setup_done" file
# setup steps are performed, they consist in:
# - media and static re-creation from empty directories
# - Django setup
#   - migrations
#   - collect static
#   - admin user and fake passwords
#   - fixtures installation

set -e

CODE_DIRECTORY='/code'
DATASOURCE_PATH='/shared-volume/project_data'
MEDIA_ROOT='/shared-volume/media'
STATIC_ROOT='/shared-volume/static'
PROJECTS_DIR="${MEDIA_ROOT}/projects"
SETUP_DONE_FILE='/shared-volume/setup_done'
DJANGO_DIRECTORY="${CODE_DIRECTORY}/g3w-admin"

cd '/code/'


if [ ! -e ${SETUP_DONE_FILE} ]; then
    echo "Setup started for G3W-Suite installation ..."

    if [ ! -e ./g3w-admin/base/settings/local_settings.py ]; then
        echo "Copying docker_settings.py to base/settings/local_settings.py"
        cp ./settings_docker.py ./g3w-admin/base/settings/local_settings.py
    fi

    echo "Cleaning up some dirs before collecting statics ..."
    ls ${MEDIA_ROOT} || mkdir ${MEDIA_ROOT}
    pushd .
    cd ${MEDIA_ROOT}/..
    ls static || ln -s media static
    popd

    echo "Creating projects(_data) directores in ${PROJECTS_DIR} ..."
    ls ${PROJECTS_DIR} || mkdir ${PROJECTS_DIR}
    ls ${DATASOURCE_PATH} || mkdir ${DATASOURCE_PATH}

    wait-for-it -h ${G3WSUITE_POSTGRES_HOST:-postgis} -p ${G3WSUITE_POSTGRES_PORT:-5432} -t 60

    pushd .
    cd ${DJANGO_DIRECTORY}/core/static
    rm -rf bower_components
    ln -s "/code/node_modules/@bower_components" bower_components
    popd

    cd ${DJANGO_DIRECTORY}
    rm -rf ${STATIC_ROOT}
    python3 manage.py collectstatic --noinput -v 0
    python3 manage.py migrate --noinput

    echo "Installing fixtures ..."
    for FIXTURE in 'BaseLayer.json' 'G3WGeneralDataSuite.json' 'G3WMapControls.json' 'G3WSpatialRefSys.json'; do
        python3 manage.py loaddata  core/fixtures/${FIXTURE}
    done
    # sync menu tree items
    python3 manage.py sitetree_resync_apps
    python3 manage.py createsuperuser --noinput --username admin --email admin@email.com || true
    # Set fake password for all users
    python3 manage.py set_passwords --password admin
    touch ${SETUP_DONE_FILE}
    echo "Setup completed ..."
else
    echo "Setup was already done, skipping ..."
    # Wait for postgis
    wait-for-it -h ${G3WSUITE_POSTGRES_HOST:-postgis} -p ${G3WSUITE_POSTGRES_PORT:-5432} -t 60

    # Restore on restart ln -s for bower_component
    cd ${DJANGO_DIRECTORY}/core/static
    rm -rf bower_components
    ln -s "/code/node_modules/@bower_components" bower_components

    rm -rf ${STATIC_ROOT}
    cd ${DJANGO_DIRECTORY}
    python3 manage.py collectstatic --noinput -v 0
    python3 manage.py migrate --noinput
    python3 manage.py sitetree_resync_apps
fi

# Make sure data are readable:
chmod -R 777 ${DATASOURCE_PATH}
