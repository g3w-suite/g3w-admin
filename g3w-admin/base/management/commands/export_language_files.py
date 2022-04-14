from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil

class Command(BaseCommand):
    help = 'Exports all found language files using the path as file naming for a future re-import.'

    def add_arguments(self, parser):
        parser.add_argument('-p', '--outpath', type=str, help='The path to the folder to which to export the files to.')

    def handle(self, *args, **options):
        separator = "___"

        output_folder_path = options['outpath']
        if not output_folder_path:
            self.stderr.write("The ouput folder path is mandatory!")
            return

        base_folder = str(settings.BASE_DIR / 'g3w-admin/g3w-admin')
        
        print(f"Looking for tanslation files (*.po) inside: {base_folder}")

        for (dir_path, dir_names, file_names) in os.walk(base_folder):
            for file_name in file_names:
                if file_name.endswith(".po"):
                    rel_path = dir_path.split("G3WSUITE/g3w-admin/g3w-admin/")[1].replace('/', separator)

                    new_filename = rel_path + separator + file_name

                    from_path = os.path.join(dir_path, file_name)
                    to_path = os.path.join(output_folder_path, new_filename)

                    print(f"Copying {from_path}")
                    print(f"   ---> {to_path}")
                    shutil.copyfile(from_path, to_path)

        print("Done.")
        
        