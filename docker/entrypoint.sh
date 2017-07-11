#!/bin/sh

# Replace the UWSGI uri in the Nginx tcp proxy configuration.
sed -e "s/{{BASEURL}}/$BASEURL/g" /home/g3wsuite/nginx.conf.tpl > /etc/nginx/sites-available/default


python /home/g3wsuite/g3w-admin/g3w-admin/manage.py migrate
python /home/g3wsuite/g3w-admin/g3w-admin/manage.py collectstatic --noinput

python /home/g3wsuite/g3w-admin/g3w-admin/manage.py initadmin

exec "$@"