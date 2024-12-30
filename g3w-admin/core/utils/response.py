from django.conf import settings
from django.http.response import HttpResponse
from django.http import FileResponse
from django.core.files import File
from django.core.exceptions import PermissionDenied
#from django_file_form.uploader import FileFormUploadBackend
import os


def send_file(output_filename, content_type, file, attachment=True):
    """
    Send a Django HttpRensponse with attached file
    :param output_filename: file name to send.
    :param content_type: mime type file to send.
    :param attachment: True default, to set Content-Disposition http header.
    :return: Django HttpResponse instance.
    """
    return FileResponse(open(file, 'rb'), filename=output_filename, as_attachment=attachment)