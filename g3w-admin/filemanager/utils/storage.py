# coding=utf-8
""""
File storage for filemanager module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-01-18'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'
__license__ = 'MPL 2.0'

from django.core.files import File
from qdjango.utils.storage import OverwriteStorage


class FileManagerOverwriteStorage(OverwriteStorage):
    """
    Custom storage for filemanager module
    """

    def save(self, name, content, max_length=None):
        """
        Override save method for bypass trasversal storage file checking
        """
        # Get the proper name for the file, as it will actually be saved.
        if name is None:
            name = content.name

        if not hasattr(content, "chunks"):
            content = File(content, name)

        # Potentially find a different name depending on storage constraints.
        name = self.get_available_name(name, max_length=max_length)

        # The save operation should return the actual name of the file saved.
        name = self._save(name, content)

        return name