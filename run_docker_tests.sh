#!/bin/bash

echo "WARNING: run_docker_tests.sh"
echo "-------------------------------------------------"
echo ""
echo "this file will be removed in next major release,"
echo "start using Makefile tasks as alternative solution"
echo ""
echo "-------------------------------------------------"

# Launch the docker compose locally and a shell to run tests from local repo
# mounted as /code in the container

# Get options paramenter
QGSV="322"
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

      if [[ $QGSV != "322" && $QGSV != "latest" ]] ; then
        echo "Error: QGIS VERSION can be one of '322', 'latest'." >/dev/stderr
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

make tests q=$QGSV mode=$MOD