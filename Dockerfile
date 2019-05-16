FROM python:2
ENV PYTHONUNBUFFERED 1
RUN apt-get update && apt install -y libgdal20
RUN mkdir /code
WORKDIR /code
COPY requirements*.* /code/
RUN pip install -r requirements_docker.txt
COPY . /code/
COPY ./settings_docker.py /code/g3w-admin/base/settings/local_settings.py
COPY ./entrypoint_docker.sh /code/
