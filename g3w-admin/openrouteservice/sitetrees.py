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

sitetrees = tuple(
    G3Wtree(
        'openrouteservice' + (f'_{tree['lang']}' if tree['lang'] != 'en' else ''),
        title=tree['title'],
        module='openrouteservice',
        items=[
            item(
                tree['routes'],
                'ors-project-list',
                icon_css_class='fa fa-road',
                in_breadcrumbs=True,
                url_as_pattern=True,
                children=[
                    item(
                        tree['add_route'],
                        'ors-project-add',
                        access_by_perms=['qdjango.change_project'],
                        in_menu=False,
                    ),
                    item(
                        tree['update_route'] + ' {{ object.name }}',
                        'ors-project-update object.slug',
                        in_menu=False,
                        alias='route-update'
                    ),
                ]
            ),
        ]
    )
    for tree in [
        {
            'lang': 'en',
            'title': 'OpenRouteService',
            'routes': 'Routes',
            'add_route': 'Add route',
            'update_route': 'Update route',
        },
        {
            'lang': 'it',
            'title': 'OpenRouteService',
            'routes': 'Percorsi',
            'add_route': 'Aggiungi percorso',
            'update_route': 'Aggiorna percorso',
        },
        {
            'lang': 'de',
            'title': 'OpenRouteService',
            'routes': 'ORS-Projekte',
            'add_route': 'Projekt hinzufügen',
            'update_route': 'Projekt aktualisieren',
        },
    ]
)
