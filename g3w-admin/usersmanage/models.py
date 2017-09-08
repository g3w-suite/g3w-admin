from __future__ import unicode_literals
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.db import models
from model_utils import Choices


class Department(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Userdata(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    department = models.OneToOneField(Department, null=True, blank=True)
    avatar = models.ImageField(_('Avatar'), upload_to='user_avatar', null=True, blank=True)


class Userbackend(models.Model):
    """
    backend authentication's user
    """

    TYPES = Choices(
        ('g3wsuite', 'G3WSUITE'),
        ('ldap', 'LDAP'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    backend = models.CharField('Backend', choices=TYPES, max_length=255)