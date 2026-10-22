# coding=utf-8
""""
Model for project bookmarks per user
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-09-22 10:18:11'
__copyright__ = 'Copyright Gis3w'


from django.db import models
from .projects import Project
from usersmanage.models import User

class ProjectBookmark(models.Model):
    """
    Model for project bookmarks per user
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_bookmarks'
    )
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE,
        related_name='project_bookmarks'
    )


    class Meta:
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.username} - {self.project.title}"