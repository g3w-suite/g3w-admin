from sitetree.utils import item
from .utils.tree import G3Wtree

sitetrees = tuple(
    G3Wtree(
        'core' + (f'_{tree['lang']}' if tree['lang'] != 'en' else ''),
        title=tree['title'],
        module='core',
        items=[
            item(
                tree['dashboard'],
                'home',
                url_as_pattern=True,
                icon_css_class='fa fa-dashboard'
            ),
            item(
                tree['maps'],
                'group-list',
                icon_css_class='fa fa-map',
                children=[
                    item(
                        tree['add_group'],
                        'group-add',
                        url_as_pattern=True,
                        access_by_perms=['core.add_group'],
                        in_menu=False,
                    ),
                    item(
                        tree['groups'],
                        'group-list',
                        url_as_pattern=True,
                        alias='group-list',
                        in_breadcrumbs=True
                    ),
                    item(
                        tree['macro_groups'],
                        'macrogroup-list',
                        url_as_pattern=True,
                        alias='macrogroup-list',
                        in_breadcrumbs=True,
                        access_by_perms=['core.add_macrogroup'],
                        children=[
                            item(
                                tree['macro_group_update'] + ' {{ object.title}}',
                                'macrogroup-update object.slug',
                                url_as_pattern=True,
                                in_menu=False,
                                alias='macrogroup-update'
                            ),
                            item(
                                tree['add_macro_group'],
                                'macrogroup-add',
                                url_as_pattern=True,
                                access_by_perms=['core.add_macrogroup'],
                                in_menu=False,
                            ),
                        ]
                    ),
                    item(
                        tree['trash'],
                        'group-deactive-list',
                        url_as_pattern=True,
                        alias='group-deactive-list',
                        in_breadcrumbs=True
                    ),
                    item(
                        tree['group_update'] + ' {{ object.title}}',
                        'group-update object.slug',
                        url_as_pattern=True,
                        in_menu=False,
                        alias='group-update'
                    ),
                    item(
                        tree['project_list'] + ' {{ group.name }}',
                        'project-list group.slug',
                        url_as_pattern=True,
                        in_menu=False,
                        in_breadcrumbs=True,
                        alias='project-list'
                    ),
                ]
            ),
        ]
    )
    for tree in [
          {
               'lang': 'it',
               'title': 'Menu',
               'dashboard': 'Scrivania',
               'maps': 'Mappe',
               'add_group': 'Aggiungi gruppo',
               'groups': 'Gruppi',
               'macro_groups': 'Macro gruppi',
               'macro_group_update': 'Agg. Macrogruppo',
               'add_macro_group': 'Aggiungi Macro gruppo',
               'trash': 'Cestino',
               'group_update': 'Agg. gruppo',
               'project_list': 'Lista progetti',
          },
          {
               'lang': 'en',
               'title': 'Menu',
               'dashboard': 'Dashboard',
               'maps': 'Maps',
               'add_group': 'Add group',
               'groups': 'Groups',
               'macro_groups': 'Macro groups',
               'macro_group_update': 'Macro group update',
               'add_macro_group': 'Add Macro group',
               'trash': 'Trash',
               'group_update': 'Group update',
               'project_list': 'Projects list',
          },
          {
               'lang': 'fr',
               'title': 'Menu',
               'dashboard': 'Bureau',
               'maps': 'Cartes',
               'add_group': 'Ajouter un groupe',
               'groups': 'Groupes',
               'macro_groups': 'Groupes Macro',
               'macro_group_update': 'Mise à jour du groupe Macro',
               'add_macro_group': 'Ajouter un groupe Macro',
               'trash': 'Pouble',
               'group_update': 'Mise à jour du groupe',
               'project_list': 'Liste des projets',
          },
          {
               'lang': 'ro',
               'title': 'Menu',
               'dashboard': 'Tablou de bord',
               'maps': 'Hărți',
               'add_group': 'Adaugă grup',
               'groups': 'Grupuri',
               'macro_groups': 'Grupuri Macro',
               'macro_group_update': 'Groups Macro update',
               'add_macro_group': 'Adaugă grup Macro',
               'trash': 'Coș de gunoi',
               'group_update': 'Groups update',
               'project_list': 'Lista proiecte',
          },
          {
               'lang': 'de',
               'title': 'Menü',
               'dashboard': 'Dashboard',
               'maps': 'Karten',
               'add_group': 'Gruppe hinzufügen',
               'groups': 'Gruppenliste',
               'macro_groups': 'Makro Gruppen',
               'macro_group_update': 'Aktualisieren Makrogruppe',
               'add_macro_group': 'Makrogruppe hinzufügen',
               'trash': 'Papierkorb',
               'group_update': 'Gruppenaktualisierung',
               'project_list': 'Projektliste',
          },
     ]
)
