from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil

class Command(BaseCommand):
    help = "Import language files previously exported through the 'export_language_files' command from a folder."

    def add_arguments(self, parser):
        parser.add_argument('-p', '--inpath', type=str, help='The path to the folder from which to import the files.')

    def handle(self, *args, **options):
        separator = "___"

        input_folder_path = options['inpath']
        if not input_folder_path:
            self.stderr.write("The input folder path is mandatory!")
            return

        base_folder = str(settings.BASE_DIR / 'g3w-admin/g3w-admin')
        
        print(f"Looking for tanslation files (*.po) inside: {input_folder_path}")

        for file in os.listdir(input_folder_path):
            if file.endswith(".po"):
                rel_file_path = file.replace(separator, "/")

                from_path = os.path.join(input_folder_path, file)
                to_path = os.path.join(base_folder, rel_file_path)
                print(f"Copying {from_path}")
                print(f"   ---> {to_path}")
                shutil.copyfile(from_path, to_path)

        print("Done.")
        
        