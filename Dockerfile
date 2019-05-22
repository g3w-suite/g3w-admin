FROM elpaso/g3w-suite-deps:latest
LABEL maintainer="Gis3w" Description="This image is used to install python requirements and code for g3w-suite local testing" Vendor="Gis3w" Version="1.0"
COPY requirements*.* /code/
RUN pip install -r requirements_docker.txt
COPY . /code/
CMD /code/ci_scripts/build_suite.sh && cd /code/g3w-admin && python manage.py runserver 0.0.0.0:8000