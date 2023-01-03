# -*- coding: utf-8 -*-
#########################################################################
#
# Copyright (C) 2018 GIS3W
#
#########################################################################

import os
import sys
sys.path.insert(0, os.getcwd())
import time
from paver.easy import task, options, cmdopts, needs
from paver.easy import path, sh, info, call_task
from paver.easy import BuildFailure

BASE_PATH = 'g3w-admin'
CURRENT_DIR = os.getcwd()
sys.path.insert(0, CURRENT_DIR+'/'+BASE_PATH)


# take from geonode pavement.py: https://github.com/GeoNode/geonode/blob/master/pavement.py
def kill(arg1, arg2):
    """Stops a process that contains arg1 and is filtered by arg2
    """
    from subprocess import Popen, PIPE

    # Wait until ready
    t0 = time.time()
    # Wait no more than these many seconds
    time_out = 30
    running = True

    while running and time.time() - t0 < time_out:
        if os.name == 'nt':
            p = Popen('tasklist | find "%s"' % arg1, shell=True,
                      stdin=PIPE, stdout=PIPE, stderr=PIPE, close_fds=False)
        else:
            p = Popen('ps aux | grep %s' % arg1, shell=True,
                      stdin=PIPE, stdout=PIPE, stderr=PIPE, close_fds=True)

        lines = p.stdout.readlines()

        running = False
        for line in lines:
            # this kills all java.exe and python including self in windows
            if ('%s' % arg2 in line) or (os.name == 'nt' and '%s' % arg1 in line):
                running = True

                # Get pid
                fields = line.strip().split()

                info('Stopping %s (process number %s)' % (arg1, fields[1]))
                if os.name == 'nt':
                    kill = 'taskkill /F /PID "%s"' % fields[1]
                else:
                    kill = 'kill -9 %s 2> /dev/null' % fields[1]
                os.system(kill)

        # Give it a little more time
        time.sleep(1)
    else:
        pass

    if running:
        raise Exception('Could not stop %s: '
                        'Running processes are\n%s'
                        % (arg1, '\n'.join([l.strip() for l in lines])))

@task
def deprecation_notice():
    info("WARNING: pavement.py")
    info("-------------------------------------------------")
    info("")
    info("this file will be removed in next major release,")
    info("start using Makefile tasks as alternative solution")
    info("")
    info("-------------------------------------------------")


@needs(['deprecation_notice'])
@task
def install():
    """
    Install G3W-SUITE
    """
    sh("make install")


@needs(['deprecation_notice'])
@task
def install_yarn_components():
    sh("make install-node-requirements")


@needs(['deprecation_notice'])
@task
def requirements():
    sh("make install-python-requirements")


@needs(['deprecation_notice'])
@task
def sync():
    """
    Run migrate for every modules
    """
    sh("make migrations")


@needs(['deprecation_notice'])
@task
def createsuperuser():
    """
    Create super user app
    """
    sh("make createsuperuser")


@needs(['deprecation_notice'])
@task
@cmdopts([
    ('bind=', 'b', 'Bind server to provided IP address and port number.'),
    ('foreground', 'f', 'Do not run in background but in foreground')
])
def start():
    """
    Start G3W-SUITE
    """
    sh('make runserver bind={} foreground={}'.format(
        options.get('bind', '0.0.0.0:8000'),
        '' if options.get('foreground', False) else '&')
    )


@task
def stop():
    """
    Stop the Django application
    """
    kill('python', 'runserver')
