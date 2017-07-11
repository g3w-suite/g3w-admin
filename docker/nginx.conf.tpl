# nginx.conf

# the upstream component nginx needs to connect to
upstream g3w-admin {
    server unix:/home/g3wsuite/g3w-admin.sock; # for a file socket
}

# configuration of the server
server {
    # the port your site will be served on, default_server indicates that this server block
    # is the block to use if no blocks match the server_name
    listen      80 default_server;

    # the domain name it will serve for
    server_name 127.0.0.1; # substitute your machine's IP address or FQDN
    charset     utf-8;

    # max upload size
    client_max_body_size 75M;   # adjust to taste

    # Django media
    location /media  {
        alias /home/g3wsuite/media;  # your Django project's media files - amend as required
    }

    location /static {
        alias /home/g3wsuite/static; # your Django project's static files - amend as required
    }


    # Finally, send all non-media requests to the Django server.
    location / {
        uwsgi_pass  g3w-admin;
        include     /home/g3wsuite/uwsgi_params; # the uwsgi_params file you installed
    }

    location /cgi-bin/ {
        # Disable gzip (it makes scripts feel slower since they have to complete
        # before getting gzipped)
        gzip off;

        allow 127.0.0.1;
        deny all;

        # Set the root to /usr/lib (inside this location this means that we are
        # giving access to the files under /usr/lib/cgi-bin)
        root  /usr/lib;

        # Fastcgi socket
        fastcgi_pass  unix:/var/run/fcgiwrap.socket;

        # Fastcgi parameters, include the standard ones
        include /etc/nginx/fastcgi_params;

        # Adjust non standard parameters (SCRIPT_FILENAME)
        fastcgi_param SCRIPT_FILENAME  /usr/lib$fastcgi_script_name;
    }

}