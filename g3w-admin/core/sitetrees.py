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
                    'MENU',
                    '#',
                    type_header=True
               ),
               item(
                    'Scrivania',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Gruppi cartografici',
                    'group-list',
                    icon_css_class='fa fa-globe',
                    children=[
                        item(
                              'Aggiungi gruppo',
                              'group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_group']
                         ),
                         item(
                              'Lista gruppi',
                              'group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='group-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Cestino',
                              'group-deactive-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-trash',
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Agg. gruppo {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Lista progetti {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         ),
                    ]
               ),
               item(
                    'Macro Gruppi cartografici',
                    'macrogroup-list',
                    access_by_perms=['core.add_macrogroup'],
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Aggiungi MACRO gruppo',
                              'macrogroup-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_macrogroup']
                         ),
                         item(
                              'Lista MACRO gruppi',
                              'macrogroup-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='macrogroup-list',
                              in_breadcrumbs=True
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
                    'MENU',
                    '#',
                    type_header=True
               ),
               item(
                    'Dashboard',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Cartographic groups',
                    'group-list',
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Add group',
                              'group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_group']
                         ),
                         item(
                              'Groups list',
                              'group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Trash',
                              'group-deactive-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-trash',
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Groups update {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Projects list {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         )
                    ]
               ),
               item(
                    'Macro Cartographic groups',
                    'macrogroup-list',
                    access_by_perms=['core.add_macrogroup'],
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Add MACRO group',
                              'macrogroup-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_macrogroup']
                         ),
                         item(
                              'MACRO groups list',
                              'macrogroup-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='macrogroup-list',
                              in_breadcrumbs=True
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
                    'MENU',
                    '#',
                    type_header=True
               ),
               item(
                    'Bureau',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Groupes cartographiques',
                    'group-list',
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Ajouter un groupe',
                              'group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_group']
                         ),
                         item(
                              'Liste des groupes',
                              'group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Pouble',
                              'group-deactive-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-trash',
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Mise à jour du groupe {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Liste des projets {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         )
                    ]
               ),
               item(
                    'Groupes macro-cartographiques',
                    'macrogroup-list',
                    access_by_perms=['core.add_macrogroup'],
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Ajouter un groupe MACRO',
                              'macrogroup-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_macrogroup']
                         ),
                         item(
                              'Liste des groupes MACRO',
                              'macrogroup-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='macrogroup-list',
                              in_breadcrumbs=True
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
                    'MENU',
                    '#',
                    type_header=True
               ),
               item(
                    'Tablou de bord',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Grupuri cartografice',
                    'group-list',
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Adaugă grup',
                              'group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_group']
                         ),
                         item(
                              'Listă grupuri',
                              'group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Coș de gunoi',
                              'group-deactive-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-trash',
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Groups update {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Lista proiecte {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         )
                    ]
               ),
               item(
                    'Grupuri MACRO Cartografice',
                    'macrogroup-list',
                    access_by_perms=['core.add_macrogroup'],
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Adaugă grup MACRO',
                              'macrogroup-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_macrogroup']
                         ),
                         item(
                              'Lista grupuri MACRO',
                              'macrogroup-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='macrogroup-list',
                              in_breadcrumbs=True
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
                    'MENÜ',
                    '#',
                    type_header=True
               ),
               item(
                    'Dashboard',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Kartografische Gruppen',
                    'group-list',
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Gruppe hinzufügen',
                              'group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_group']
                         ),
                         item(
                              'Gruppenliste',
                              'group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Papierkorb',
                              'group-deactive-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-trash',
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Gruppenaktualisierung {{ object.title }}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Projektliste {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         )
                    ]
               ),
               item(
                    'Makro-Kartografische Gruppen',
                    'macrogroup-list',
                    access_by_perms=['core.add_macrogroup'],
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Makrogruppe hinzufügen',
                              'macrogroup-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_macrogroup']
                         ),
                         item(
                              'Makrogruppenliste',
                              'macrogroup-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='macrogroup-list',
                              in_breadcrumbs=True
                         ),
                    ]
               ),
          ]
     ),

     # BULGARIAN
     G3Wtree(
          'core_bg',
          title='Меню',
          module='core',
          items=[
               item(
                    'Меню',
                    '#',
                    type_header=True
               ),
               item(
                    'Табло',
                    'home',
                    url_as_pattern=True,
                    icon_css_class='fa fa-dashboard'
               ),
               item(
                    'Картографска група',
                    'group-list',
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Добави група',
                              'group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_group']
                         ),
                         item(
                              'Списък групи',
                              'group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='group-list',
                              in_breadcrumbs=False
                         ),
                         item(
                              'Кошче',
                              'group-deactive-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-trash',
                              alias='group-deactive-list',
                              in_breadcrumbs=True
                         ),
                         item(
                              'Обновяване на група {{ object.title}}',
                              'group-update object.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False,
                              alias='group-update'
                         ),
                         item(
                              'Списък проекти в {{ group.name }}',
                              'project-list group.slug',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              in_menu=False,
                              in_breadcrumbs=True,
                              alias='project-list'
                         )
                    ]
               ),
               item(
                    'Макро групи',
                    'macrogroup-list',
                    access_by_perms=['core.add_macrogroup'],
                    icon_css_class='fa fa-globe',
                    children=[
                         item(
                              'Добави макро група',
                              'macrogroup-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['core.add_macrogroup']
                         ),
                         item(
                              'Списък макро групи',
                              'macrogroup-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-globe',
                              alias='macrogroup-list',
                              in_breadcrumbs=True
                         ),
                    ]
               ),
          ]
     ),
)
