#!/bin/bash

# Launch the docker compose locally and a shell to run tests from local repo
# mounted as /code in the container

# Get options paramenter
QGSV="ltr"
MOD="build"

usage() {                                 # Function: Print a help message.
  echo "Usage: $0 [ -q QGIS VERSION ] [ -m MODE ]" 1>&2
}

exit_abnormal() {                         # Function: Exit with error.
  usage
  exit 1
}

while getopts ":q:m:" options; do

  case $options in
    q)
      QGSV=${OPTARG}

      if [[ $QGSV != "ltr" && $QGSV != "latest" ]] ; then
        echo "Error: QGIS VERSION can be one of 'ltr', 'latest'." >/dev/stderr
        exit_abnormal
        exit 1
      fi
      ;;
    m)
      MOD=${OPTARG}
      if [[ $MOD != "build" && $MOD != "test" && $MOD != "down" ]] ; then
        echo "Error: MODE can be one of 'build', 'test', 'down'." >/dev/stderr
        exit_abnormal
        exit 1
      fi
      ;;
    :)
      echo "Error: -${OPTARG} requires an argument." >/dev/stderr
      exit_abnormal
      ;;
    *)
      exit_abnormal
      ;;
  esac
done

DOCKER_COMMAND="docker compose -f docker-compose.$QGSV.yml"

if [ $MOD == "down" ]; then
  $DOCKER_COMMAND down
  exit 1
fi

if [ -e ./g3w-admin/base/settings/local_settings.py ]; then
    mv ./g3w-admin/base/settings/local_settings.py ./g3w-admin/base/settings/local_settings.py.`date +"%Y-%m-%d_%H:%M:%S"`.backup
fi

cp settings_docker.py ./g3w-admin/base/settings/local_settings.py


# Down the current containers
echo "Down current containers active"
echo "------------------------------"
$DOCKER_COMMAND down

echo "Start containers"
echo "------------------------------"
$DOCKER_COMMAND up -d

echo "Copy current code into containers"
echo "---------------------------------"
$DOCKER_COMMAND cp . g3w-suite:/code/

echo "Execute pip3 install requirements"
echo "---------------------------------"
$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/ && pip3 install -r requirements_docker.txt && pip3 install -r requirements_huey.txt"

$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/caching/requirements.txt"

$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/filemanager/requirements.txt"

$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/qplotly/requirements.txt"

$DOCKER_COMMAND exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/openrouteservice/requirements.txt && pip3 install -r g3w-admin/openrouteservice/requirements_testing.txt"


echo "Execute build_suite.sh"
echo "----------------------"
$DOCKER_COMMAND exec g3w-suite sh -c "/code/ci_scripts/build_suite.sh"

echo "Execute setup_suite.sh"
echo "----------------------"
$DOCKER_COMMAND exec g3w-suite sh -c "/code/ci_scripts/setup_suite.sh"


if [ $MOD == "test" ]; then

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test core"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qdjango"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test usersmanage"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test client"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test editing.tests"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test caching"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test filemanager"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qplolty"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test openrouteservice"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qtimeseries"

    $DOCKER_COMMAND exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test about"

else
    $DOCKER_COMMAND exec g3w-suite bash
fi

