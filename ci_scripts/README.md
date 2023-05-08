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

It is recommended to use [g3w-suite-docker](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/README_DEV.md) repository.