from django.core.management.base import BaseCommand
from core.models import Group, G3WSpatialRefSys
from qdjango.utils.data import QgisProject
from qdjango.models import Project
from django.core.files import File
from django.conf import settings
import os, subprocess, shutil

class Command(BaseCommand):

    help = 'Add a project to DB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            # default=os.path.realpath(f"{ settings.BASE_DIR }/../qdjango/tests/data/g3wsuite_project_test_qgis328.qgs"),
            default="building-management-demo.qgs",
            help='Absolute path to .qgis project file.'
        )
        parser.add_argument(
            '--data',
            # default=os.path.realpath(f"{ settings.BASE_DIR }/../qdjango/tests/data/geodata/"),
            default="-1",
            help='Absolute path to data folder related to .qgis project.'
        )

    def handle(self, *args, **options):

        # Fallback to remote "g3w-suite-demo-projects" repository (eg. --file="public-building-management-demo.qgs")
        if (not os.path.exists(options['file'])):
            if (not os.path.isdir('/tmp/g3w-suite-demo-projects')):
                subprocess.call("git clone https://github.com/g3w-suite/g3w-suite-demo-projects.git --single-branch --depth 1 --branch master /tmp/g3w-suite-demo-projects", shell=True)
            else:
                subprocess.call("git config --global --add safe.directory /tmp/g3w-suite-demo-projects", shell=True)
                subprocess.call("git -C /tmp/g3w-suite-demo-projects pull https://github.com/g3w-suite/g3w-suite-demo-projects.git", shell=True)
            shutil.copytree('/tmp/g3w-suite-demo-projects/project_data/', settings.DATASOURCE_PATH, dirs_exist_ok=True)
            options['file'] = f"/tmp/g3w-suite-demo-projects/projects/{ options['file'] }"
            options['data'] = '-1'

        # Ensure "projects_data" is there
        if (options['data'] and "-1" != options['data']):
            options['data']=options['data'].rstrip('/') + '/'
            out_dir=os.path.join(settings.DATASOURCE_PATH + os.path.basename(os.path.dirname(options['data'])))
            print(f"Copying { options['data']}")
            shutil.copytree(options['data'], out_dir, dirs_exist_ok=True)
            print(f"   ---> {out_dir}")

        # Create or Update project
        project = QgisProject(File(open(options['file'], 'r')))

        try:
            instance = Project.objects.get(title=project.title)
            group = instance.group
        except Project.DoesNotExist:
            instance = None
            group,_ =  Group.objects.get_or_create(
                name=project.srid,
                defaults={
                    'title': project.srid,
                    'srid': G3WSpatialRefSys.objects.get(auth_srid=project.srid)
                }
            )

        group.is_active = True
        group.save()

        project.group = group

        project.save(instance=instance)

        print(f"   ---> { (instance or project.instance).qgis_file.path }")