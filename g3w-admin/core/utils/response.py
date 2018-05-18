from django.http.response import HttpResponse
from django.core.files import File


def send_file(output_filename, content_type, file, attachment=True):

    response = HttpResponse(File(open(file,'r')), content_type=content_type)
    if attachment:
        response['Content-Disposition'] = 'attachment; filename="{}"'.format(output_filename)

    return response