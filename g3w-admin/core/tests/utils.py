# coding=utf-8
""""
    Core testing utils functions
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-03'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django_file_form.models import TemporaryUploadedFile as UploadedFile
from django.core.files import File
import uuid
import os


CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/core/tests/data/'


def create_dff_image(field_name, original_filename=None):
    """
    Create a fake record django_file_form_image for form using it
    :param field_name:
    :param original_filename:
    :return: UploadedFile model object
    """

    image = open('{}g3wsuite_logo.png'.format(CURRENT_PATH + TEST_BASE_PATH), 'rb')

    form_id = uuid.uuid4()
    file_id = uuid.uuid4()

    uf = UploadedFile(
        form_id=form_id,
        file_id=file_id,
        field_name=field_name,
        original_filename=original_filename if original_filename else field_name,
        uploaded_file=File(image, name='g3wsuite_logo.png')
    )
    uf.save()

    return uf


def clear_dff_image():
    """
    Clear UploadedFile model
    :return: None
    """
    UploadedFile.objects.all().delete()