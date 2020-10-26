Scripts meant to be run in the Docker.deps container before running CI tests.

Dockerfile.deps is the base docker image with deb packages required to build and run g3w-suite

# build_suite.sh

The script takes care of:
- installing requirements
- building js code


# setup_suite.sh

- preparing directories (media, static etc.)
- setting up django (migration, collect static etc.)

# For local development

Build the image for development with dockerfile based on main Ubuntu server images.

```
docker build -f Dockerfile.local-develpment-ubuntu-2004.dockerfile -t g3wsuite/g3w-suite-local-development:20.04 .
```

create a `.env` file with main env variable like this:

```bash
# absolute path to g3w-admin code
G3W_SUITE_CODE_PATH=/home/walter/PycharmProjects/g3w_suite_qgis_api

# absolute path to a plce where mount permanent virtualenv data
G3W_SUITE_VENV_PATH=/home/envs/g3w-suite-local-dev-docker

# absolute path to folder contains static and media django folder
G3W_SUITE_WWW_PATH=/home/www
```

set your `local_settings.py` to work inside docker container then run `run_env_development.sh`

```bash
./run_env_development.sh
```

a docker container with name `g3w-suite-local-dev` is created, access to container to run django/g3w-suite command. 