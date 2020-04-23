from django.http.response import HttpResponse
from django.core.files import File


def send_file(output_filename, content_type, file, attachment=True):
    """
    Send a Django HttpRensponse with attached file
    :param output_filename: file name to send.
    :param content_type: mime type file to send.
    :param attachment: True default, to set Content-Disposition http header.
    :return: Django HttpResponse instance.
    """
    response = HttpResponse(File(open(file, 'rb')), content_type=content_type)
    if attachment:
        response['Content-Disposition'] = 'attachment; filename="{}"'.format(output_filename)

    return response