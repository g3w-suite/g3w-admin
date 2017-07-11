#!/bin/sh

# Replace the UWSGI uri in the Nginx tcp proxy configuration.
sed -e "s/{{BASEURL}}/$BASEURL/g" /home/g3wsuite/nginx.conf.tpl > /etc/nginx/sites-available/default

/etc/init.d/postgresql start

/bin/sleep 10

python /home/g3wsuite/g3w-admin/g3w-admin/manage.py migrate
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py collectstatic --noinput
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata BaseLayer.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata G3WGeneralDataSuite.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata G3WMapControls.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata G3WSpatialRefSys.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py sitetree_resync_apps

python /home/g3wsuite/g3w-admin/g3w-admin/manage.py initadmin

exec "$@"