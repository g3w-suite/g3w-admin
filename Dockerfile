FROM g3wsuite/g3w-suite-deps:latest
LABEL maintainer="Gis3w" Description="This image is used to install python requirements and code for g3w-suite local testing" Vendor="Gis3w" Version="1.0"

# set env vars necessary to correctly install python3 requirements
ARG CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV CPLUS_INCLUDE_PATH=$CPLUS_INCLUDE_PATH
ARG C_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=$C_INCLUDE_PATH

# install py3 requirements
COPY requirements*.* /code/
RUN pip3 install -r requirements_docker.txt

# build g3w-suite and run it
COPY . /code/
CMD /code/ci_scripts/build_suite.sh && cd /code/g3w-admin && python3 manage.py runserver 0.0.0.0:8000