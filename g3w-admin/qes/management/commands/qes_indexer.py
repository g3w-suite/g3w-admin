# coding=utf-8
""""
    Commands Elasticsearch indexing.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-08-29'
__copyright__ = 'Copyright Gis3w'

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from qdjango.models import Project
from qes.utils.indexer import QGISElasticsearchIndexer
from qes.utils import get_users
from qes.utils.config import is_project_indexing_enabled


class Command(BaseCommand):
    """
    This command execute the indexing of the qdjango projects for every users had access to the the projects
    """

    help = 'Indexing QGIS projects in Elasticsearch'

    def add_arguments(self, parser):

        parser.add_argument(
            '--prj_ids',
            nargs='*',
            type=int,
            help='Optional project IDs for features indexing inside of Elasticsearch.'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            default=False,
            help=(
                'Index the selected projects even if the es_conf plugin '
                'reports them as disabled (or is not installed and the '
                'legacy QES_INDEXING_PROJECT setting is False).'
            ),
        )

    def handle(self, *args, **options):

        # Check for project IDs
        prj_ids = options.get('prj_ids', None)
        force = options.get('force', False)
        if prj_ids is None:

            # Get every project IDs
            self.stdout.write(self.style.NOTICE(f'Indexing every project...'))
            prjs = Project.objects.all()

        else:
            prjs = Project.objects.filter(pk__in=prj_ids)


        for prj in prjs:
            # Skip projects for which indexing is not enabled — the
            # ``is_project_indexing_enabled`` hook consults the es_conf
            # plugin when installed (per-project ``ProjectEsConfig.enabled``)
            # and falls back to ``settings.QES_INDEXING_PROJECT`` otherwise.
            if not force and not is_project_indexing_enabled(prj):
                self.stdout.write(self.style.WARNING(
                    f"Skipping Project ID {prj.id} '{prj.title}' — indexing not enabled "
                    f"(use --force to override)."
                ))
                continue

            self.stdout.write(self.style.NOTICE(f"Indexing Project ID '{prj.title}'..."))

            users = get_users(prj)

            for user in users:
                indexer = QGISElasticsearchIndexer('default', user)
                indexer.index_project(prj)

            self.stdout.write(self.style.SUCCESS(f'Project ID {prj.id} indexed successfully.'))




