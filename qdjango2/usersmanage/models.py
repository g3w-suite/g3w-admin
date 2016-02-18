from __future__ import unicode_literals
from django.contrib.auth.models import User

from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True,null=True)

class UserData(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    department = models.OneToOneField(Department)