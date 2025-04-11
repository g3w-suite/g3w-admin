#!/bin/bash

# Entry point for G3W-SUITE (docker image)

set -e

SETUP_DONE='/shared-volume/setup_done'

#TODO: make use of global "django-admin" command instead of relative "./manage.py"?
cd /code/g3w-admin

echo -e "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"

# Check for default files/directories #############################

if [ ! -e /code/g3w-admin/base/settings/local_settings.py ]; then
  cp /code/settings_docker.py /code/g3w-admin/base/settings/local_settings.py
fi

mkdir -p /shared-volume/media                      # static files (private and public)
mkdir -p /shared-volume/media/projects             # qgis projects (.qgs files)
mkdir -p /shared-volume/project_data               # qgis data (eg. shapefiles)
mkdir -p /shared-volume/media/temp_uploads         # "django-file-form"
chmod -R 777 /shared-volume/project_data           # make "project_data" directory readable

###################################################################

# wait for postgis
until pg_isready -h ${G3WSUITE_POSTGRES_HOST:-postgis} -p ${G3WSUITE_POSTGRES_PORT:-5432}; do
  echo "wait 30s until is ready"
  sleep 30;
done

# create SECRET_KEY
if [ ! -e /shared-volume/.secret_key ]; then
  ./manage.py generate_secret_key_file -o /shared-volume/.secret_key
fi

# collect static files (public / production)
if [[ ! -e ${SETUP_DONE} || -z ${G3WSUITE_DEBUG} || ${G3WSUITE_DEBUG} != "True" ]]; then
  rm -rf /shared-volume/static
  ln -s /shared-volume/media /shared-volume/static
  ./manage.py collectstatic --noinput -v 0
elif [[ ${G3WSUITE_DEBUG} == "True" ]]; then
  rm -rf /shared-volume/static
fi

# update database (eg. after installing a new plugin)
./manage.py migrate --noinput

# import default data 
if [ ! -e ${SETUP_DONE} ]; then
  ./manage.py loaddata /code/g3w-admin/core/fixtures/BaseLayer.json
  ./manage.py loaddata /code/g3w-admin/core/fixtures/G3WGeneralDataSuite.json
  ./manage.py loaddata /code/g3w-admin/core/fixtures/G3WMapControls.json
  ./manage.py loaddata /code/g3w-admin/core/fixtures/G3WSpatialRefSys.json
fi

# create default admin user
if [ ! -e ${SETUP_DONE} ]; then
  ./manage.py createsuperuser --noinput --username ${G3WSUITE_ADMIN_USERNAME:-admin} --email admin@email.com || true
  ./manage.py set_passwords --password ${G3WSUITE_ADMIN_PASSWORD:-admin}
fi

# update sidebar menu items (eg. after installing/translating a plugin)
./manage.py sitetree_resync_apps

# emit file: "/shared-volume/setup_done"
if [ ! -e ${SETUP_DONE} ]; then
  touch ${SETUP_DONE}
fi

echo -e "\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"