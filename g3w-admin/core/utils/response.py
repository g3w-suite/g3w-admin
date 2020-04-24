from django.http.response import HttpResponse
from django.core.files import File
from django_file_form.uploader import FileFormUploadBackend
import os

def send_file(output_filename, content_type, file, attachment=True):

    response = HttpResponse(File(open(file, 'rb')), content_type=content_type)
    if attachment:
        response['Content-Disposition'] = 'attachment; filename="{}"'.format(output_filename)

    return response


class G3WFileFormUploadBackend(FileFormUploadBackend):
    """ Extend default upload backend class of django-file-form module """

    def update_filename(self, request, filename, *args, **kwargs):
        """ Update filename to save on host, if an extension exist it is added to new hash name file """

        hh = super().update_filename(request, filename, *args, **kwargs)

        # Add file extension:
        ext = os.path.splitext(filename)
        if ext[1]:
            hh += ext[1]
        return hh
