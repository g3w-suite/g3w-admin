from sitetree.utils import item
from .utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

     # ITALIAN
     G3Wtree(
          'core_it',
          title='Menu',
          module='core',
          items=[
              item(
                    'Scrivania',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Mappe',
                    'group-list',
                    icon_css_class='fa fa-map',
                    children=[
                        item(
                              'Aggiungi gruppo',
                              'group-add',
                              url_as_pattern=True,
                              access_by_perms=['core.add_group'],
                              in_menu=False,
                         ),
                         item(
                              'Gruppi',
                              'group-list',
                              url_as_pattern=True,
                              alias='group-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Macro gruppi',
                              'macrogroup-list',
                              url_as_pattern=True,
                              alias='macrogroup-list',
                              in_breadcrumbs=True,
                              access_by_perms=['core.add_macrogroup'],
                              children=[
                                   item(
                                        'Agg. Macrogruppo {{ object.title}}',
                                        'macrogroup-update object.slug',
                                        url_as_pattern=True,
                                        in_menu=False,
                                        alias='macrogroup-update'
                                   ),
                                   item(
                                        'Aggiungi Macro gruppo',
                                        'macrogroup-add',
                                        url_as_pattern=True,
                                        access_by_perms=['core.add_macrogroup'],
                                        in_menu=False,
                                   ),
                              ]
                         ),
                         item(
                              'Cestino',
                              'group-deactive-list',
                              url_as_pattern=True,
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Agg. gruppo {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Lista progetti {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         ),
                    ]
               ),
          ]
     ),

     # ENGLISH
     G3Wtree(
          'core',
          title='Menu',
          module='core',
          items=[
               item(
                    'Dashboard',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Maps',
                    'group-list',
                    icon_css_class='fa fa-map',
                    children=[
                         item(
                              'Add group',
                              'group-add',
                              url_as_pattern=True,
                              access_by_perms=['core.add_group'],
                              in_menu=False,
                         ),
                         item(
                              'Groups',
                              'group-list',
                              url_as_pattern=True,
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Macro groups',
                              'macrogroup-list',
                              url_as_pattern=True,
                              alias='macrogroup-list',
                              in_breadcrumbs=True,
                              access_by_perms=['core.add_macrogroup'],
                              children=[
                                   item(
                                        'Macro group update {{ object.title}}',
                                        'macrogroup-update object.slug',
                                        url_as_pattern=True,
                                        in_menu=False,
                                        alias='macrogroup-update'
                                   ),
                                   item(
                                        'Add Macro group',
                                        'macrogroup-add',
                                        url_as_pattern=True,
                                        access_by_perms=['core.add_macrogroup'],
                                        in_menu=False,
                                   ),
                              ]
                         ),
                         item(
                              'Trash',
                              'group-deactive-list',
                              url_as_pattern=True,
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Groups update {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Projects list {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         ),
                    ]
               ),
          ]
     ),

     # FRENCH
     G3Wtree(
          'core_fr',
          title='Menu',
          module='core',
          items=[
               item(
                    'Bureau',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Cartes',
                    'group-list',
                    icon_css_class='fa fa-map',
                    children=[
                         item(
                              'Ajouter un groupe',
                              'group-add',
                              url_as_pattern=True,
                              access_by_perms=['core.add_group'],
                              in_menu=False,
                         ),
                         item(
                              'Groupes',
                              'group-list',
                              url_as_pattern=True,
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Groupes Macro',
                              'macrogroup-list',
                              url_as_pattern=True,
                              alias='macrogroup-list',
                              in_breadcrumbs=True,
                              access_by_perms=['core.add_macrogroup'],
                              children=[
                                  item(
                                        'Mise à jour du groupe Macro {{ object.title}}',
                                        'macrogroup-update object.slug',
                                        url_as_pattern=True,
                                        in_menu=False,
                                        alias='macrogroup-update'
                                   ),
                                   item(
                                        'Ajouter un groupe Macro',
                                        'macrogroup-add',
                                        url_as_pattern=True,
                                        access_by_perms=['core.add_macrogroup'],
                                        in_menu=False,
                                   ),
                              ]
                         ),
                         item(
                              'Pouble',
                              'group-deactive-list',
                              url_as_pattern=True,
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Mise à jour du groupe {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Liste des projets {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         ),
                    ]
               ),
          ]
     ),

     # ROMANIAN
     G3Wtree(
          'core_ro',
          title='Menu',
          module='core',
          items=[
               item(
                    'Tablou de bord',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Hărți',
                    'group-list',
                    icon_css_class='fa fa-map',
                    children=[
                         item(
                              'Adaugă grup',
                              'group-add',
                              url_as_pattern=True,
                              access_by_perms=['core.add_group'],
                              in_menu=False,
                         ),
                         item(
                              'Grupuri',
                              'group-list',
                              url_as_pattern=True,
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Grupuri Macro',
                              'macrogroup-list',
                              url_as_pattern=True,
                              alias='macrogroup-list',
                              in_breadcrumbs=True,
                              access_by_perms=['core.add_macrogroup'],
                              children=[
                                  item(
                                        'Groups Macro update {{ object.title}}',
                                        'macrogroup-update object.slug',
                                        url_as_pattern=True,
                                        in_menu=False,
                                        alias='macrogroup-update'
                                   ),
                                   item(
                                        'Adaugă grup Macro',
                                        'macrogroup-add',
                                        url_as_pattern=True,
                                        access_by_perms=['core.add_macrogroup'],
                                        in_menu=False,
                                   ),
                              ]
                         ),
                         item(
                              'Coș de gunoi',
                              'group-deactive-list',
                              url_as_pattern=True,
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Groups update {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Lista proiecte {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         ),
                    ]
               ),
          ]
     ),

     # GERMAN
     G3Wtree(
          'core_de',
          title='Menü',
          module='core',
          items=[
               item(
                    'Dashboard',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Karten',
                    'group-list',
                    icon_css_class='fa fa-map',
                    children=[
                        item(
                              'Gruppe hinzufügen',
                              'group-add',
                              url_as_pattern=True,
                              access_by_perms=['core.add_group'],
                              in_menu=False,
                         ),
                         item(
                              'Gruppenliste',
                              'group-list',
                              url_as_pattern=True,
                              alias='group-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Makro Gruppen',
                              'macrogroup-list',
                              url_as_pattern=True,
                              alias='macrogroup-list',
                              in_breadcrumbs=True,
                              access_by_perms=['core.add_macrogroup'],
                              children=[
                                   item(
                                        'Aktualisieren Makrogruppe {{ object.title}}',
                                        'macrogroup-update object.slug',
                                        url_as_pattern=True,
                                        in_menu=False,
                                        alias='macrogroup-update'
                                   ),
                                   item(
                                        'Makrogruppe hinzufügen',
                                        'macrogroup-add',
                                        url_as_pattern=True,
                                        access_by_perms=['core.add_macrogroup'],
                                        in_menu=False,
                                   ),
                              ]
                         ),
                         item(
                              'Papierkorb',
                              'group-deactive-list',
                              url_as_pattern=True,
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Gruppenaktualisierung {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Projektliste {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         ),
                    ]
               ),
          ]
     ),
)
