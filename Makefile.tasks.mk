## 
# Makefile for G3W-ADMIN tasks (local development server, automated docker tests, database migrations, ...)
##

##
# Add here common files and folder paths
##
include Makefile.assets.mk

##
# Initial database structure
##
G3W_ADMIN_FIXTURES =      BaseLayer.json G3WGeneralDataSuite.json G3WMapControls.json G3WSpatialRefSys.json

##
# Shell commands
##
PYTHON ?=      python3
PIP ?=         pip

# export PATH := $(VENV_BIN):$(PATH)

##
# Start django server
#
# make runserver \
#	[ bind = "server IP address and port number" ] \
#	[ foreground = "set any value to disable background" ]
##
runserver: $(INCLUDE_MAKEFILES)
	$(PYTHON) $(APPS_FOLDER)/manage.py runserver \
		$$( [ -n "$$bind" ] && echo $$bind || echo '0.0.0.0:8000' ) \
		$$( [ -n "$$foreground" ] && echo '&' || echo '' )
	@echo "G3W-SUITE is now available."

##
# Create django super user
##
createsuperuser:
	@echo $(H1__) Create superuser (if not already exists) $(__H1)
	$(PYTHON) $(APPS_FOLDER)/manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser(\"admin\", \"admin@email.com\", \"admin\") if not User.objects.filter(username=\"admin\").exists() else None"

##
# Run database migrations for every module
##
migrations:
	$(PYTHON) $(APPS_FOLDER)/manage.py migrate --noinput

	# load fixture
	$(foreach fixture, \
		${G3W_ADMIN_FIXTURES}, \
		$(eval $(PYTHON) $(APPS_FOLDER)/manage.py loaddata $(APPS_FOLDER)/core/fixtures/${fixture}) \
	)

	$(PYTHON) $(APPS_FOLDER)/manage.py migrate --noinput

	# sync menu tree items
	$(PYTHON) $(APPS_FOLDER)/manage.py sitetree_resync_apps

##
# Install python dependencies
##
install-python-requirements:
	@echo $(H1__) Installing Python modules... $(__H1)
	@echo
	$(PYTHON) $(APPS_FOLDER)/manage.py migrate --noinput
	$(PIP) install -r requirements.txt
	$(PIP) install -r requirements_huey.txt
	@echo
	@echo done

##
# Install node dependencies
##
install-node-requirements:
	@echo $(H1__) Installing Yarn/Bower components... $(__H1)
	$(MAKE) --no-print-directory $(BOWER_COMPONENTS_FOLDER)
	@echo
	@echo done

##
# Install G3W-SUITE
##
install-suite: install-node-requirements install-python-requirements migrations createsuperuser
	@echo G3W-SUITE installed with success!

##
# Setup G3W-SUITE (run this inside a docker container)
#
# 1. Symlink folders: "node_modules/@bower_components" <--> "g3w-admin/core/static/bower_components"
# 2. Copy file: "docker_settings.py --> g3w-admin/base/settings/local_settings.py"#
# 3. Make folder: "/shared-volume/media"
# 4. Make folder: "/shared-volume/static"
# 5. Make folder: "/shared-volume/media/projects"
# 6. Make folder: "/shared-volume/project_data"
# 7. Run Django collecstatic
# 8. Run Django migrations
# 9. Run Django createsuperuser
##
setup-suite: \
		$(BOWER_COMPONENTS_FOLDER) \
		$(LOCAL_SETTINGS_FILE) \
		$(SHARED_VOLUME)/media \
		$(SHARED_VOLUME)/static \
		$(SHARED_VOLUME)/media/projects \
		$(SHARED_VOLUME)/project_data

	@echo $(H1__) Setup G3W-SUITE $(__H1)

	wait-for-it -h $${G3WSUITE_POSTGRES_HOST:-postgis} -p $${G3WSUITE_POSTGRES_PORT:-5432} -t 60

	# Clear static folder
	rm -rf $(SHARED_VOLUME)/static

	# Collect static assets
	if [[ -z $${G3WSUITE_DEBUG} || $${G3WSUITE_DEBUG} != "True" ]]; then \
		$(PYTHON) $(APPS_FOLDER)/manage.py collectstatic --noinput -v 0 ;\
	fi

	$(MAKE) --no-print-directory migrations
	$(MAKE) --no-print-directory createsuperuser
		
	# Make sure data folder is readable
	chmod -R 777 $(SHARED_VOLUME)/project_data

##
# FIXME: https://github.com/g3w-suite/g3w-admin/commit/c02634aeec0987a027c0ebe14330878e7a073713#diff-d6c56c417db8a4e61f846b14bf452cd780b704b14c3e626bcb3507b7936f9bac
#
# Build docker image (local development server)
##
build-docker:
	docker build \
		-f Dockerfile.local-develpment-ubuntu-2004.dockerfile \
		-t g3wsuite/g3w-suite-local-development:20.04 \
		.

##
# FIXME: https://github.com/g3w-suite/g3w-admin/commit/c02634aeec0987a027c0ebe14330878e7a073713#diff-d6c56c417db8a4e61f846b14bf452cd780b704b14c3e626bcb3507b7936f9bac
#
# Start docker server (local development server)
#
# makefile rundocker \
#	[ G3W_SUITE_CODE_PATH = "absolute path to g3w-admin code" ] \
#	[ G3W_SUITE_VENV_PATH = "absolute path to a place where mount permanent virtualenv data" ] \
#	[ G3W_SUITE_WWW_PATH = "absolute path to folder contains static and media django folder" ] \
##
run-docker: G3W_SUITE_CODE_PATH = /home/walter/PycharmProjects/g3w_suite_qgis_api
run-docker: G3W_SUITE_VENV_PATH = /home/envs/g3w-suite-local-dev-docker
run-docker: G3W_SUITE_WWW_PATH = /home/www
run-docker:
	# Source environment variables
	. .env \

	docker run -itd \
		-e WORKON_HOME=/envs \
		-e VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 \
		-v $${G3W_SUITE_VENV_PATH}:/envs \
		-v $${G3W_SUITE_CODE_PATH}:/code \
		-v $${G3W_SUITE_CODE_PATH}/g3w-admin/core/static/bower_components:/code/g3w-admin/core/static/bower_components \
		-v $${G3W_SUITE_WWW_PATH}:/home/www \
		-p 8008:8008 \
		--name g3w-suite-local-dev \
		g3wsuite/g3w-suite-local-development:20.04 \
		/bin/bash

	#/bin/bash /runserver.sh
	# source /usr/local/bin/virtualenvwrapper.sh && workon g3w-suite

##
# Run docker tests locally
#
# make tests [ q = 322 | latest ] [ mode = build | test | down ]
##
tests: q = 322
tests: mode = build
tests: DOCKER_COMPOSE := "docker compose -f docker-compose.$(q).yml"
tests:
	# Launch the docker compose locally
	# and a shell to run tests from local
	# repo mounted as /code in the container

	if [ $(mode) == "down" ]; then \
		$(DOCKER_COMPOSE) down ;\
		exit 1 ;\
	fi

	if [ -e ./g3w-admin/base/settings/local_settings.py ]; then \
		mv \
			./g3w-admin/base/settings/local_settings.py \
			./g3w-admin/base/settings/local_settings.py.`date +"%Y-%m-%d_%H:%M:%S"`.backup ;\
	fi \

	cp settings_docker.py ./g3w-admin/base/settings/local_settings.py

	# Start Docker container
	@echo "------------------------------"
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) up -d

	# Copy current code into the container
	@echo "---------------------------------"
	$(DOCKER_COMPOSE) cp . g3w-suite:/code/

	# Install Python requirements
	@echo "---------------------------------"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/ && python3 -m pip install pip==20.0.2 && pip3 install -r requirements_docker.txt && pip3 install -r requirements_huey.txt"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/caching/requirements.txt"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/filemanager/requirements.txt"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/qplotly/requirements.txt"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/ && pip3 install -r g3w-admin/openrouteservice/requirements.txt && pip3 install -r g3w-admin/openrouteservice/requirements_testing.txt"

	# Symlink bower components folder
	@echo "----------------------"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "$(MAKE) --no-print-directory $(BOWER_COMPONENTS_FOLDER)"

	# Setup suite
	@echo "----------------------"
	$(DOCKER_COMPOSE) exec g3w-suite sh -c "$(MAKE) --no-print-directory setup-suite"

	if [ $(mode) == "test" ]; then \
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test core" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qdjango" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test usersmanage" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test client" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test editing.tests" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test caching" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test filemanager" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qplolty" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test openrouteservice" ;\
		$(DOCKER_COMPOSE) exec g3w-suite sh -c "cd /code/g3w-admin && python3 manage.py test qtimeseries" ;\
	else \
		$(DOCKER_COMPOSE) exec g3w-suite bash ;\
	fi