#!/bin/sh

# Replace the UWSGI uri in the Nginx tcp proxy configuration.
if [ -n "$BASEURL" ]; then
	sed -e "s/{{BASEURL}}/$BASEURL/" /home/timon/nginx-app.conf.tpl > /etc/nginx/sites-available/default
else
	echo "ERROR - Must specify: -e BASEURL=<baseurl>"
	exit 1
fi

python /home/g3wsuite/g3w-admin/g3w-admin/manage.py migrate
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py collectstatic --noinput
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata auth.groups.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata base.appdatas.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata base.appsections.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py loaddata base.wmscustomlayers.json
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py initadmin

exec "$@"