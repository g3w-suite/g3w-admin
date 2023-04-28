#!/bin/bash
#
# Build  script for g3w-suite, to be run inside the docker container
#
# Depending on the existence of "build_done" file
# setup steps are performed, they consist in:
# - js build with yarn

set -e

CODE_DIRECTORY='/code'
DJANGO_DIRECTORY="${CODE_DIRECTORY}/g3w-admin"
DATASOURCE_PATH='/shared-volume/project_data'
MEDIA_ROOT='/shared-volume/media'
PROJECTS_DIR="${MEDIA_ROOT}/projects"
BUILD_DONE_FILE='/shared-volume/build_done'
SECRET_KEY_FILE='/shared-volume/.secret_key'

cd "${CODE_DIRECTORY}"


if [ ! -e ${BUILD_DONE_FILE} ]; then
    echo "Build started for G3W-Suite installation ..."

    echo "Install javascript dependencies ..."
    yarn --ignore-engines --ignore-scripts --prod
    nodejs -e "try { require('fs').symlinkSync(require('path').resolve('node_modules/@bower_components'), 'g3w-admin/core/static/bower_components', 'junction') } catch (e) { console.log(e); }"

    cd "${DJANGO_DIRECTORY}"
    echo "Creating a unique SECRET_KEY file ..."
    python3 manage.py generate_secret_key_file -o ${SECRET_KEY_FILE}

    touch ${BUILD_DONE_FILE}

    cd "${CODE_DIRECTORY}"
else
    echo "Build already done, skipping ..."
fi

