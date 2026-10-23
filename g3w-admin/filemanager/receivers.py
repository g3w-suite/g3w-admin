# coding=utf-8
"""" Django signals receivers
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = "lorenzetti@gis3w.it"
__date__ = "2023-08-29"
__copyright__ = "Copyright 2015 - 2023, Gis3w"
__license__ = "MPL 2.0"

from django.conf import settings
from django.dispatch import receiver
from usersmanage.signals import after_save_user_form
from usersmanage.configs import G3W_EDITOR1
from usersmanage.utils import userHasGroups

from os import makedirs, path
import logging

logger = logging.getLogger('filemanager')



@receiver(after_save_user_form)
def make_project_data_subdir(sender, user, **kwargs):
    """
    Given a user instance create if not exists a folder into `settings.DATASOURCE_PATH`
    """

    # Check if user is an Editor level 1
    if not userHasGroups(user, [G3W_EDITOR1]):
        return

    makedirs(path.join(settings.DATASOURCE_PATH, user.username), exist_ok=True)





