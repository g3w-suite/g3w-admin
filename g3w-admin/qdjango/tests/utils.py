# coding=utf-8
""""
   Qdjango testing utils functions
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
TEST_BASE_PATH = '/qdjango/tests/data/'


def create_dff_project(field_name, original_filename=None):
    """
    Create a fake record django_file_form qgis project for form using it
    :param field_name:
    :param original_filename:
    :return: UploadedFile model object
    """

    project = open('{}gruppo-1_un-progetto_qgis34_no_title.qgs'.format(CURRENT_PATH + TEST_BASE_PATH), 'r')

    form_id = uuid.uuid4()
    file_id=uuid.uuid4()

    uf = UploadedFile(
        form_id=form_id,
        file_id=file_id,
        field_name=field_name,
        original_filename=original_filename if original_filename else 'gruppo-1_un-progetto_qgis34_no_title.qgs',
        uploaded_file=File(project, name='gruppo-1_un-progetto_qgis34_no_title.qgs')
    )
    uf.save()

    return uf

def create_dff_project_qgz(field_name, original_filename=None):
    """
    Create a fake record django_file_form qgis project (.qgz) for form using it
    :param field_name:
    :param original_filename:
    :return: UploadedFile model object
    """

    project = open('{}test_qgz_project_328.qgz'.format(CURRENT_PATH + TEST_BASE_PATH), 'rb')

    form_id = uuid.uuid4()
    file_id=uuid.uuid4()

    uf = UploadedFile(
        form_id=form_id,
        file_id=file_id,
        field_name=field_name,
        original_filename=original_filename if original_filename else 'test_qgz_project_328.qgz',
        uploaded_file=File(project, name='test_qgz_project_328.qgz')
    )
    uf.save()

    return uf


def clear_dff_project():
    """
    Clear UploadedFile model
    :return: None
    """
    UploadedFile.objects.all().delete()