#!/bin/bash

source .env


docker run -itd \
-e WORKON_HOME=/envs \
-e VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 \
-v ${G3W_SUITE_VENV_PATH}:/envs \
-v ${G3W_SUITE_CODE_PATH}:/code \
-v ${G3W_SUITE_CODE_PATH}/g3w-admin/core/static/bower_components:/code/g3w-admin/core/static/bower_components \
-v ${G3W_SUITE_WWW_PATH}:/home/www \
-p 8008:8008 \
--name g3w-suite-local-dev \
g3wsuite/g3w-suite-local-development:20.04 \
/bin/bash
#/bin/bash /runserver.sh




#source /usr/local/bin/virtualenvwrapper.sh && workon g3w-suite
#


