Scripts meant to be run in the Docker.deps container before running CI tests.

Dockerfile.deps is the base docker image with deb packages required to build and run g3w-suite

# build_suite.sh

Kept as a no-op for compatibility with existing deployments. Frontend assets are served directly.

# setup_suite.sh

- preparing directories (media, static etc.)
- setting up Django (migration, collect static etc.)

# For local development

It is recommended to use [g3w-suite-docker](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/README_DEV.md) repository.