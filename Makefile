##
# Makefile entrypoint
##

PROJECT_NAME = G3W-ADMIN

##
# see: <https://github.com/g3w-suite/makefiles/>
##
INCLUDE_MAKEFILES_RELEASE = v0.1.2
INCLUDE_MAKEFILES =         Makefile.semver.mk Makefile.venv.mk

##
# Get a list of tasks when `make` is run without args.
##
default: list-tasks
help: list-tasks

##
# Download required packages
##
install: clean $(INCLUDE_MAKEFILES) venv install-reqs
	@:

##
# Download and include any makefiles
# specified in the INCLUDE_MAKEFILES list
##
$(INCLUDE_MAKEFILES):
	wget https://raw.githubusercontent.com/g3w-suite/makefiles/$(INCLUDE_MAKEFILES_RELEASE)/$@
$(foreach i, ${INCLUDE_MAKEFILES}, $(eval include $i))

##
# Remove downloaded makefiles
##
clean:
	rm $(INCLUDE_MAKEFILES)

##
# Print a list of available tasks
#
# https://stackoverflow.com/a/26339924
##
list-tasks:
	@echo Available tasks:
	@echo ----------------
	@$(MAKE) -pRrq -f $(firstword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | grep -E -v -e '^[^[:alnum:]]' -e '^$@$$'
	@echo

##
# Include here any project specific tasks
##
include Makefile.assets.mk
include Makefile.server.mk