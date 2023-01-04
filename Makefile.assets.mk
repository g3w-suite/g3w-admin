## 
# Makefile for G3W-ADMIN assets (CSS/JS, fonts, images)
##

##
# Common files and folder paths
##
BOWER_COMPONENTS_FOLDER = g3w-admin/core/static/bower_components
LOCAL_SETTINGS_FILE =     g3w-admin/base/settings/local_settings.py
SHARED_VOLUME =           /shared-volume
APPS_FOLDER =            g3w-admin

##
# TODO: find out how to remove gulp as dependency (ref: gulp-useref, gulp-uglify, gulp-clean-css)
#
# Generate CSS an JS bundles:
#
# g3w-admin/templates/base.html --> g3w-admin/core/static/dist/css/vendor.min.css
# g3w-admin/templates/base.html --> g3w-admin/core/static/dist/css/g3wadmin.min.css
# g3w-admin/templates/base.html --> g3w-admin/core/static/dist/js/vendor.min.js
# g3w-admin/templates/base.html --> g3w-admin/core/static/dist/js/g3wadmin.min.js
# 
##
build-assets: icheck_png fonts font-summernote
	gulp build && rm g3w-admin/core/static/dist/base.html

##
# Update css folder:
#
# g3w-admin/core/static/dist/css/ <-- g3w-admin/core/static/bower_components/icheck/skins/flat/blue*.png
# g3w-admin/core/static/dist/css/ <-- g3w-admin/core/static/bower_components/icheck/skins/flat/green*.png
##
icheck_png: LOOKUP_RULE = -maxdepth 1 -type f \( -name "blue*.png" -or -name "green*.png" \)
icheck_png: INPUT_FILES = $(shell find g3w-admin/core/static/bower_components/icheck/skins/flat/ $(LOOKUP_RULE))
icheck_png: DEST_FOLDER = g3w-admin/core/static/dist/css/
icheck_png:
	cp -vi ${INPUT_FILES} ${DEST_FOLDER}

##
# Update fonts folder: 
#
# g3w-admin/core/static/dist/fonts/ <-- g3w-admin/core/static/bower_components/**/*.{eot,ttf,woff,woff2}
# g3w-admin/core/static/dist/fonts/ <-- g3w-admin/core/static/modules/**/*.{eot,ttf,woff,woff2}
##
fonts: LOOKUP_RULE = -type f \( -name "*.eot" -or -name "*.ttf" -or -name "*.woff" -or -name "*.woff2" \)
fonts: INPUT_FILES = $(shell find g3w-admin/core/static/bower_components $(LOOKUP_RULE)) $(shell find g3w-admin/core/static/modules/ $(LOOKUP_RULE))
fonts: DEST_FOLDER = g3w-admin/core/static/dist/fonts/
fonts:
	cp -vi ${INPUT_FILES} ${DEST_FOLDER}

##
# Update fonts folder:
#
# g3w-admin/core/static/dist/css/font/ <-- g3w-admin/core/static/modules/summernote/font/*.{eot,ttf,woff,woff2}
##
fonts-summernote: LOOKUP_RULE = -maxdepth 1 -type f \( -name "*.eot" -or -name "*.ttf" -or -name "*.woff" -or -name "*.woff2" \)
fonts-summernote: INPUT_FILES = $(shell find g3w-admin/core/static/modules/summernote/font/ $(LOOKUP_RULE))
fonts-summernote: DEST_FOLDER = g3w-admin/core/static/dist/css/font/
fonts-summernote:
	cp -vi ${INPUT_FILES} ${DEST_FOLDER}

##
# Symlink folders:
#
# node_modules/@bower_components <--> g3w-admin/core/static/bower_components
##
$(BOWER_COMPONENTS_FOLDER):
	yarn --ignore-engines --ignore-scripts --prod ;\
	nodejs -e "try { require('fs').symlinkSync(require('path').resolve('node_modules/@bower_components'), $(BOWER_COMPONENTS_FOLDER), 'junction') } catch (e) { console.log(e); }"

##
# Copy file:
#
# docker_settings.py --> g3w-admin/base/settings/local_settings.py
##
$(LOCAL_SETTINGS_FILE):
	cp ./settings_docker.py ./g3w-admin/base/settings/local_settings.py

##
# Make folder:
#
# /shared-volume/media
##
$(SHARED_VOLUME)/media:
	cd $(SHARED_VOLUME) && mkdir media

##
# Make folder:
#
# /shared-volume/static
##
$(SHARED_VOLUME)/static: $(SHARED_VOLUME)/media
	cd $(SHARED_VOLUME) && ln -s media static

##
# Make folder:
#
# /shared-volume/media/projects
##
$(SHARED_VOLUME)/media/projects: $(SHARED_VOLUME)/media
	cd $(SHARED_VOLUME)/media && mkdir projects

##
# Make folder: 
#
# /shared-volume/project_data
##
$(SHARED_VOLUME)/project_data:
	cd $(SHARED_VOLUME) && mkdir project_data