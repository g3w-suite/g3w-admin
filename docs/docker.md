# Dockerization

This dockerization is based on project of Alessandro Pasotti (elpaso, https://github.com/elpaso).

## Configuration

Create a file `.env` (or copy `.env.example` and rename it in `.env`) and place it in the main directory, the file
will contain the database credentials (change `<your password>`) and other settings:

```bash
# External hostname, for docker internal network aliases
WEBGIS_PUBLIC_HOSTNAME=demo.g3wsuite.it/
WEBGIS_DOCKER_SHARED_VOLUME=/tmp/shared-volume-g3w-suite


# DB setup
G3WSUITE_POSTGRES_USER_LOCAL=g3wsuite
G3WSUITE_POSTGRES_PASS=<your_password>
G3WSUITE_POSTGRES_DBNAME=g3wsuite
G3WSUITE_POSTGRES_HOST=postgis
G3WSUITE_POSTGRES_PORT=5432

# Caching
G3WSUITE_TILECACHE_PATH=/shared-volume/tile_cache/
TILESTACHE_CACHE_BUFFER_SIZE=256

# URL of the QGIS Server
G3WSUITE_QDJANGO_SERVER_URL=http://qgisserver/ows/

# Set G3W-SUITE debug state
G3WSUITE_DEBUG = 1 (0 default)
```

## Build

### G3W-SUITE

The main suite image can be built with:

```bash
docker build -f Dockerfile.g3wsuite.dockerfile -t g3wsuite/g3w-suite-dev:latest --no-cache .
```

The container image is build from `https://github.com/g3w-suite/g3w-admin.git --branch dev`

The Docker hub name for this image is `g3wsuite/g3w-suite-dev:latest`

### Postgis

Postgis image can be built with:

```bash
docker build -f Dockerfile.postgis -t g3wsuite/postgis:11.0-2.5 .
```

The Docker hub name for this image is `g3wsuite/postgis:11.0-2.5`

### QGIS Server

QGIS Server image is built from `https://github.com/elpaso/qgis-server-docker/tree/production`

The Docker hub name for this image is `g3wsuite/qgis3-server:ltr-ubuntu`

### HTTPS additional setup


- check the domain name in the `.env` file and in `config/nginx/django_ssl.conf`
- run `mkdir -p /shared-volume/ssl/certs/`
- run `sudo openssl dhparam -out /shared-volume/ssl/certs/dhparam-2048.pem 2048`
- run: `docker pull certbot/certbot`
- launch `./run_certbot.sh`
- make sure the certs are renewed by adding a cron job with `crontab -e` and add the following line:
    `0  3 * * * /home/g3w-suite/rl.g3wsuite.it/run_certbot.sh`
- if you disabled HTTPS, you can move `config/nginx/django_ssl.conf` back to its original location now, and restart the Docker compose to finally enable HTTPS

## Run

```bash
docker-compose up -d
```

## Ports

+ web application: 8080

## Volumes

Data, projects, uploads and the database are stored in a shared mounted volume `shared-volume`, the volume should be on a persistent storage device and a backup
policy must be enforced.


## First time setup

+ log into the application web administation panel using default credentials (*admin/admin*)
+ change the password for the admin user and for any other example user that may be present

## Caching

Tile cache can be configured and cleared per-layer through the webgis admin panel and lasts forever until it is disabled or cleared.

> Tip: enable cache on linestring and polygon layers.


## Style customization

Templates can now be overridden by placing the overrides in the `config/g3w-suite/overrides/templates`, a Docker service restart is required to make the changes effective.

The logo is also overridden (through `config/g3w-suite/settings_docker.py` which is mounted as a volume), changes to the settings file require the Docker service to be restarted.

A custom CSS is added to the pages, the file is located in `config/g3w-suite/overrides/static/style.css` and can be modified directly, changes are effective immediately.


## Performances optimization

General rules (in no particular order: they are all mandatory):

1. set scale-dependent visibility for the entire layer or for some filtered features (example: show only major roads until at scale 1:1E+6)
2. when using rule-based/categorized classification or scale-dependent visibility create indexes on the column(s) involved in the rule expression (example: "create index idx_elec_penwell_ious on elec_penwell_ious (owner);" )
3. start the project with only a few layers turned on by default
4. do not turn on by default base-layers XYZ such as (Google base maps)
5. do not use rule-based/categorized rendering on layers with too many categories (example: elec_penwell_public_power), they are unreadable anyway
6. enable redering simplification for not-point layers, set it to `Distance` `1.2` and check `Enable provider simplification if available`

## PostgreSQL administration

Postgres is running into a Docker container, in order to access the container, you can follow the instruction below:

### Check the container name

```bash
$ docker ps | grep postgis
84ef6a8d23e6        g3wsuite/postgis:11.0-2.5       "/bin/sh -c /docker-…"   2 days ago          Up 2 days           0.0.0.0:5438->5432/tcp           g3wsuitedocker_postgis_1
```

In the above example the container name is `g3wsuitedocker_postgis_1`

### Log into the container

```bash
$ docker exec -it g3wsuitedocker_postgis_1 bash
```

### Become postgres user

```bash
root@84ef6a8d23e6:/# su - postgres
```

### Connect to postgis

```bash
postgres@84ef6a8d23e6:~$ psql
psql (11.2 (Debian 11.2-1.pgdg90+1))
Type "help" for help.

postgres=#
```
