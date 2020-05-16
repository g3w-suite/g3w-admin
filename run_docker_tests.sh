#!/bin/bash

# Launch the docker compose locally and a shell to run tests from local repo
# mounted as /code in the container

DOCKER_COMMAND="docker-compose -f docker-compose-local.yml"

if [ -e ./g3w-admin/base/settings/local_settings.py ]; then
    mv ./g3w-admin/base/settings/local_settings.py ./g3w-admin/base/settings/local_settings.py.`date +"%Y-%m-%d_%H:%M:%S"`.backup
fi

cp settings_docker.py ./g3w-admin/base/settings/local_settings.py


$DOCKER_COMMAND down

$DOCKER_COMMAND up -d

$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/ && pip3 install -r requirements_docker.txt"

$DOCKER_COMMAND exec g3w-suite sh -c "rm /shared-volume/build_done"

$DOCKER_COMMAND exec g3w-suite sh -c "/code/ci_scripts/build_suite.sh"

$DOCKER_COMMAND exec g3w-suite sh -c "/code/ci_scripts/setup_suite.sh"


if [ "$1" == 'test' ]; then

    #$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test core"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qdjango"

    #$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test usersmanage"

    #$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test client"

    #$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test editing.tests"

else
    $DOCKER_COMMAND exec g3w-suite bash
fi

