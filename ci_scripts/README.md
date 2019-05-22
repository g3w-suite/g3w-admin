Scripts meant to be run in the Docker.deps container before running CI tests.

They take care of:
- installing requirements
- building js code
- setting up django (migration, collect static etc.)

