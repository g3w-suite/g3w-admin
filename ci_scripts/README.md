Scripts meant to be run in the Docker.deps container before running CI tests.

Dockerfile.deps is the base docker image with deb packages required to build and run g3w-suite

The script takes care of:
- installing requirements
- building js code
- setting up django (migration, collect static etc.)

