# coding=utf-8
""""Admin menu for Openrouteservice

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__    = 'elpaso@itopen.it'
__date__      = '2021-03-30'
__copyright__ = 'Copyright 2021, Gis3W'


from sitetree.utils import item
from core.utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

    # ITALIAN
    G3Wtree(
        'openrouteservice_it',
        title='Openrouteservice',
        module='openrouteservice',
        items=[
            item(
                'Openrouteservice',
                '#',
                type_header=True
            ),
            item(
                'ORS Progetti',
                '#',
                icon_css_class='fa fa-road',
                children=[
                    item(
                        'Aggiungi progetto',
                        'ors-project-add',
                        url_as_pattern=True,
                        icon_css_class='fa fa-plus',
                        access_by_perms=['qdjango.change_project']
                    ),
                    item(
                        'Lista progetti',
                        'ors-project-list',
                        url_as_pattern=True,
                        icon_css_class='fa fa-list'
                    ),
                ]
            ),
        ]
    ),

    # ENGLISH
    G3Wtree(
        'openrouteservice',
        title='Openrouteservice',
        module='openrouteservice',
        items=[
            item(
                'Openrouteservice',
                '#',
                type_header=True
            ),
            item(
                'ORS Projects',
                '#',
                icon_css_class='fa fa-road',
                children=[
                    item(
                        'Add project',
                        'ors-project-add',
                        url_as_pattern=True,
                        icon_css_class='fa fa-plus',
                        access_by_perms=['qdjango.change_project']
                    ),
                    item(
                        'List projects',
                        'ors-project-list',
                        url_as_pattern=True,
                        icon_css_class='fa fa-list'
                    ),
                ]
            ),
        ]
    ),

    # GERMAN
    G3Wtree(
        'openrouteservice_de',
        title='Openrouteservice',
        module='openrouteservice',
        items=[
            item(
                'Openrouteservice',
                '#',
                type_header=True
            ),
            item(
                'ORS-Projekte',
                '#',
                icon_css_class='fa fa-road',
                children=[
                    item(
                        'Projekt hinzufügen',
                        'ors-project-add',
                        url_as_pattern=True,
                        icon_css_class='fa fa-plus',
                        access_by_perms=['qdjango.change_project']
                    ),
                    item(
                        'Projektliste',
                        'ors-project-list',
                        url_as_pattern=True,
                        icon_css_class='fa fa-list'
                    ),
                ]
            ),
        ]
    ),

    # ENGLISH
    G3Wtree(
        'openrouteservice',
        title='Openrouteservice',
        module='openrouteservice',
        items=[
            item(
                'Openrouteservice',
                '#',
                type_header=True
            ),
            item(
                'Проекти Openrouteservice',
                '#',
                icon_css_class='fa fa-road',
                children=[
                    item(
                        'Добави проект',
                        'ors-project-add',
                        url_as_pattern=True,
                        icon_css_class='fa fa-plus',
                        access_by_perms=['qdjango.change_project']
                    ),
                    item(
                        'Списък проекти',
                        'ors-project-list',
                        url_as_pattern=True,
                        icon_css_class='fa fa-list'
                    ),
                ]
            ),
        ]
    ),
)
