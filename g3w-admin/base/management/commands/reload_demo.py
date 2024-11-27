from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings
import os, glob, subprocess, shutil

class Command(BaseCommand):

    help = 'Import all demo projects from: https://github.com/g3w-suite/g3w-suite-demo-projects'

    def handle(self, *args, **options):

        # Clone qgis project from remote repository into a temporary folder (eg. --file="public-building-management-demo.qgs")
        if (not os.path.isdir('/tmp/g3w-suite-demo-projects')):
            subprocess.call("git clone https://github.com/g3w-suite/g3w-suite-demo-projects.git --single-branch --depth 1 --branch master /tmp/g3w-suite-demo-projects", shell=True)
        else:
            subprocess.call("git config --global --add safe.directory /tmp/g3w-suite-demo-projects", shell=True)
            subprocess.call("git -C /tmp/g3w-suite-demo-projects pull https://github.com/g3w-suite/g3w-suite-demo-projects.git", shell=True)

        shutil.copytree('/tmp/g3w-suite-demo-projects/project_data/', settings.DATASOURCE_PATH, dirs_exist_ok=True)

        # Load all qgis projects into DB
        for file in glob.glob('/tmp/g3w-suite-demo-projects/projects/*.qgs'):
            call_command('load_project', file=file, data="-1")

        # shutil.copytree(os.path.realpath(f"{ settings.BASE_DIR }/../qdjango/tests/data/geodata"), f"{settings.DATASOURCE_PATH}/geodata", dirs_exist_ok=True)
        # shutil.copytree(os.path.realpath(f"{ settings.BASE_DIR }/../qdjango/tests/data/editing"), f"{settings.DATASOURCE_PATH}/editing", dirs_exist_ok=True)

        # for file in glob.glob(os.path.realpath(f"{ settings.BASE_DIR }/../qdjango/tests/data/*.qgs")):
        #     call_command('load_project', file=file, data="-1")