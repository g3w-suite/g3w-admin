# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.apps import AppConfig


class ConstraintsConfig(AppConfig):
    name = 'constraints'
    verbose_name = 'Constraints'

    def ready(self):
        """Connect constraints filter to post save for post-mortem validation"""

        import constraints.receivers