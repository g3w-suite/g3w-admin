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

FIXTURES = [
    'BaseLayer.json',
    'G3WGeneralDataSuite.json',
    'G3WMapControls.json',
    'G3WSpatialRefSys.json'
]


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
            if (bytes(arg2,'UTF-8') in line) or (os.name == 'nt' and bytes(arg2,'UTF-8') in line):
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
@needs([
    'install_yarn_components',
    'requirements',
    'sync',
    'createsuperuser'
])
def install():
    """
    Install G3W-SUITE
    """
    info('G3W-SUITE installed with success')


@task
def install_yarn_components():
    info("Installing Yarn/Bower components...")
    sh('yarn --ignore-engines --ignore-scripts --prod')
    sh('node -e "try { require(\'fs\').symlinkSync(require(\'path\').resolve(\'node_modules/@bower_components\'), '
       '\'g3w-admin/core/static/bower_components\', \'junction\') } catch (e) { }"')
    info("Yarn/Bower components installed.")


@task
def requirements():
    info("Installing Python modules...")
    sh('pip install -r requirements.txt')
    sh('pip install -r requirements_huey.txt')
    try:
        sh('pip install -r g3w-admin/caching/requirements.txt')
    except:
        info("`Caching` module not active")

    try:
        sh('pip install -r g3w-admin/filemanager/requirements.txt')
    except:
        info("`Filemanager` module not active")

    try:
        sh('pip install -r g3w-admin/qplotly/requirements.txt')
    except:
        info("`Qplotly` module not active")

    try:
        sh('pip install -r g3w-admin/openrouteservice/requirements.txt')
    except:
        info("`Openrouteservice` module not active")

    info("Python modules installed.")


@task
def sync():
    """
    Run migrate for every modules
    """
    sh("python {}/manage.py migrate --noinput".format(BASE_PATH))

    # load fixture
    for fixture in FIXTURES:
        sh("python {}/manage.py loaddata {}".format(BASE_PATH, fixture))

    # sync menu tree items
    sh("python {}/manage.py sitetree_resync_apps".format(BASE_PATH))


@task
def createsuperuser():
    """
    Create super user app
    """
    sh("python {}/manage.py createsuperuser".format(BASE_PATH))


@task
@cmdopts([
    ('bind=', 'b', 'Bind server to provided IP address and port number.'),
    ('foreground', 'f', 'Do not run in background but in foreground')
])
def start():
    """
    Start G3W-SUITE
    """
    bind = options.get('bind', '')
    foreground = '' if options.get('foreground', False) else '&'
    sh('python {}/manage.py runserver {} {}'.format(BASE_PATH, bind, foreground))
    info("G3W-SUITE is now available.")


@task
def stop():
    """
    Stop the Django application
    """
    kill('python', 'runserver')
