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

# static files (private and public)
if [ ! -d /shared-volume/media ]; then
  ls /shared-volume/media || mkdir /shared-volume/media
fi

# qgis projects (.qgs files)
if [ ! -d /shared-volume/media/projects ]; then
  ls /shared-volume/media/projects || mkdir /shared-volume/media/projects
fi

# qgis data (eg. shapefiles)
if [ ! -d /shared-volume/project_data ]; then
  ls /shared-volume/project_data || mkdir /shared-volume/project_data
fi

# "django-file-form"
if [ ! -d /shared-volume/media/temp_uploads ]; then
  ls /shared-volume/media/temp_uploads || mkdir /shared-volume/media/temp_uploads
fi

# static files (public)
if [ ! -d /shared-volume/static ]; then
  ls /shared-volume/static || ln -s /shared-volume/media /shared-volume/static
fi

# clean up django static files directory
if [ -e ${SETUP_DONE} ] || [[ -z ${G3WSUITE_DEBUG} || ${G3WSUITE_DEBUG} != "True" ]]; then
  rm -rf /shared-volume/static
fi

# make project_data directory readable
chmod -R 777 /shared-volume/project_data

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

# collect django static files
if [[ -z ${G3WSUITE_DEBUG} || ${G3WSUITE_DEBUG} != "True" ]]; then
  ./manage.py collectstatic --noinput -v 0
fi

# create default admin user
if [ ! -e ${SETUP_DONE} ]; then
  ./manage.py createsuperuser --noinput --username ${G3WSUITE_ADMIN_USERNAME:-admin} --email admin@email.com || true
  ./manage.py set_passwords --password ${G3WSUITE_ADMIN_PASSWORD:-admin}
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

# update sidebar menu items (and translations)
./manage.py sitetree_resync_apps

if [ ! -e ${SETUP_DONE} ]; then
  touch ${SETUP_DONE}
fi

echo -e "\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"