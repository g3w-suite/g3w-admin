FROM elpaso/g3w-suite-deps:latest
LABEL maintainer="Gis3w" Description="This image is used to install python requirements and code for g3w-suite CI testing" Vendor="Gis3w" Version="1.0"
COPY requirements*.* /code/
RUN pip install -r requirements_docker.txt
COPY . /code/
CMD ["/code/entrypoint_docker.sh"]