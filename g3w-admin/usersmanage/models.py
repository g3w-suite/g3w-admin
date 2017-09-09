from __future__ import unicode_literals
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.db import models
from core.utils.models import G3WChoices


class Department(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Userdata(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    department = models.OneToOneField(Department, null=True, blank=True)
    avatar = models.ImageField(_('Avatar'), upload_to='user_avatar', null=True, blank=True)

USER_BACKEND_TYPES = G3WChoices(
        ('g3wsuite', 'G3WSUITE'),
    )


class Userbackend(models.Model):
    """
    backend authentication's user
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    backend = models.CharField('Backend', max_length=255)
    options = models.TextField('Options', null=True, blank=True)

    def __str__(self):
        return self.backend