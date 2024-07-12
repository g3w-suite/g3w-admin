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
DJANGO_DIRECTORY="${CODE_DIRECTORY}/g3w-admin"
DATASOURCE_PATH='/shared-volume/project_data'
MEDIA_ROOT='/shared-volume/media'
STATIC_ROOT='/shared-volume/static'
PROJECTS_DIR="${MEDIA_ROOT}/projects"
SECRET_KEY_FILE='/shared-volume/.secret_key'
SETUP_DONE_FILE='/shared-volume/setup_done'

cd "${CODE_DIRECTORY}"


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

    until pg_isready -h ${G3WSUITE_POSTGRES_HOST:-postgis} -p ${G3WSUITE_POSTGRES_PORT:-5432}; do
      echo "wait 30s until is ready"
      sleep 30;
    done
    
    pushd .
    cd ${DJANGO_DIRECTORY}/core/static
    rm -rf bower_components
    ln -s "/code/node_modules/@bower_components" bower_components
    popd

    echo "Creating a unique SECRET_KEY file ..."
    python3 "${DJANGO_DIRECTORY}/manage.py" generate_secret_key_file -o ${SECRET_KEY_FILE}

    cd ${DJANGO_DIRECTORY}
    if [[ -z ${G3WSUITE_DEBUG} || ${G3WSUITE_DEBUG} != "True" ]]; then
      rm -rf ${STATIC_ROOT}
      python3 manage.py collectstatic --noinput -v 0
    fi
    python3 manage.py migrate --noinput

    echo "Installing fixtures ..."
    for FIXTURE in 'BaseLayer.json' 'G3WGeneralDataSuite.json' 'G3WMapControls.json' 'G3WSpatialRefSys.json'; do
        python3 manage.py loaddata  core/fixtures/${FIXTURE}
    done
    # sync menu tree items
    python3 manage.py sitetree_resync_apps
    python3 manage.py createsuperuser --noinput --username ${G3WSUITE_ADMIN_USERNAME:-admin} --email admin@email.com || true
    # Set fake password for all users
    python3 manage.py set_passwords --password ${G3WSUITE_ADMIN_PASSWORD:-admin}

    # For django-file-form: create <media_directory>/temp_uploads if not exists
    ls ${MEDIA_ROOT}/temp_uploads || mkdir ${MEDIA_ROOT}/temp_uploads


    touch ${SETUP_DONE_FILE}
    echo "Setup completed ..."
else
    echo "Setup was already done, skipping ..."
    # Wait for postgis
    until pg_isready -h ${G3WSUITE_POSTGRES_HOST:-postgis} -p ${G3WSUITE_POSTGRES_PORT:-5432}; do
      echo "wait 30s until is ready"
      sleep 30;
    done

    # Restore on restart ln -s for bower_component
    cd ${DJANGO_DIRECTORY}/core/static
    rm -rf bower_components
    ln -s "/code/node_modules/@bower_components" bower_components

    # Create SECRET_KEY value file if not exists
    if [ ! -e ${SECRET_KEY_FILE} ]; then
    echo "Creating a unique SECRET_KEY file ..."
    python3 "${DJANGO_DIRECTORY}/manage.py" generate_secret_key_file -o ${SECRET_KEY_FILE}
    fi

    rm -rf ${STATIC_ROOT}
    cd ${DJANGO_DIRECTORY}
    if [[ -z ${G3WSUITE_DEBUG} || ${G3WSUITE_DEBUG} != "True" ]]; then
      python3 manage.py collectstatic --noinput -v 0
    fi
    python3 manage.py migrate --noinput
    python3 manage.py sitetree_resync_apps
fi

# Make sure data are readable:
chmod -R 777 ${DATASOURCE_PATH}
