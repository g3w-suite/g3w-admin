FROM ubuntu:16.04
MAINTAINER Walter Lorenzetti<lorenzetti@gis3w.it>

RUN  apt-get update && apt-get install -y \
	git \
	python-pip \
	software-properties-common

RUN add-apt-repository ppa:ubuntugis/ubuntugis-unstable
RUN apt-get update && apt-get dist-upgrade -y && apt-get install -y \
    libxml2-dev \
    libxslt-dev \
    postgresql-server-dev-all \
    libgdal-dev

RUN mkdir /home/apps
RUN mkdir /home/apps/g3w-suite
RUN mkdir /home/apps/g3w-suite/www/
RUN mkdir /home/apps/g3w-suite/www/media
RUN mkdir /home/apps/g3w-suite/www/static
WORKDIR /home/apps/g3w-suite

RUN git clone https://wlorenzetti:kotegaeshi7890@bitbucket.org/gis3w/g3w-admin.git g3w-admin

WORKDIR /home/apps/g3w-suite/g3w-admin
RUN pip install -r requirements.txt

# install python-gdal
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

RUN pip install GDAL

# install bower
RUN apt-get install -y nodejs-legacy npm
RUN npm install -g bower
RUN bower --allow-root install


