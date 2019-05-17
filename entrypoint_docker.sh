#!/bin/bash

set -e

echo "Installing Suite ..."

yarn --ignore-engines --ignore-scripts --prod
nodejs -e "try { require('fs').symlinkSync(require('path').resolve('node_modules/@bower_components'), 'g3w-admin/core/static/bower_components', 'junction') } catch (e) { }"


echo "Copying docker_settings.py to /base/settings/local_settings.py"
cp ./settings_docker.py ./g3w-admin/base/settings/local_settings.py

echo "Cleaning up some dirs before collecting statics ..."
rm -rf static
mkdir static
rm -rf media
ln -s static media

pushd .
cd g3w-admin/core/static
rm -rf bower_components
ln -s "/code/node_modules/@bower_components" bower_components
popd

echo "Starting Django setup and server ..."
cd g3w-admin
python manage.py collectstatic
python manage.py migrate
python manage.py createsuperuser --noinput --username admin --email admin@email.com
python manage.py set_fake_passwords --password admin
python manage.py runserver 0.0.0.0:8000
