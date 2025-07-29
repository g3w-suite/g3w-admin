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

    def handle(self, *args, **options):

        # Check for project IDs
        prj_ids = options.get('prj_ids', None)
        if prj_ids is None:
            
            # Get every project IDs
            self.stdout.write(self.style.NOTICE(f'Indexing every project...'))
            prjs = Project.objects.all()
        
        else:
            prjs = Project.objects.filter(pk__in=prj_ids)
        
        
        for prj in prjs:
            self.stdout.write(self.style.NOTICE(f"Indexing Project ID '{prj.title}'..."))

            users = get_users(prj)

            for user in users:
                indexer = QGISElasticsearchIndexer('default', user)
                indexer.index_project(prj)
            
            self.stdout.write(self.style.SUCCESS(f'Project ID {prj.id} indexed successfully.'))




