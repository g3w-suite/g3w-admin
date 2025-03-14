from sitetree.utils import item
from core.utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

     # ITALIAN 
     G3Wtree(
          'acl_it',
          title='ACL',
          module='usermanage',
          items=[
               item(
                    'Utenti',
                    'user-list',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Utenti',
                              'user-list',
                              url_as_pattern=True,
                              children=[
                                   item(
                                        'Aggiungi utente',
                                        'user-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                                   item(
                                        'Agg. utente',
                                        'user-update object.pk',
                                        url_as_pattern=True,
                                        in_menu=False
                                   ),
                              ]
                         ),
                         item(
                              'Gruppi',
                              'user-group-list',
                              url_as_pattern=True,
                              access_by_perms=['auth.add_group'],
                              children=[
                                   item(
                                      'Aggiungi gruppo utenti',
                                        'user-group-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_group'],
                                        in_menu=False
                                   )
                              ]
                         )
                    ]
               ),
          ]
     ),

     # ENGLISH
     G3Wtree(
          'acl',
          title='ACL',
          module='usermanage',
          items=[
               item(
                    'Users',
                    'user-list',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Users',
                              'user-list',
                              url_as_pattern=True,
                              children=[
                                   item(
                                        'Add user',
                                        'user-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                                   item(
                                        'User update',
                                        'user-update object.pk',
                                        url_as_pattern=True,
                                        in_menu=False
                                   ),
                              ]
                         ),
                         item(
                              'Groups',
                              'user-group-list',
                              url_as_pattern=True,
                              access_by_perms=['auth.add_user'],
                              children=[
                                   item(
                                        'Add group users',
                                        'user-group-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                              ]
                         )
                    ]
               ),
          ]
     ),

     # GERMAN
     G3Wtree(
          'acl_de',
          title='ACL',
          module='usermanage',
          items=[
               item(
                    'ACL',
                    '#',
                    type_header=True
               ),
               item(
                    'Benutzer',
                    '#',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Benutzer hinzufügen',
                              'user-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-user-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Benutzerliste',
                              'user-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-users'
                         ),
                         item(
                              'Benutzeraktualisierung',
                              'user-update object.pk',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False
                         ),
                         item(
                              'Gruppenbenutzer hinzufügen',
                              'user-group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Gruppenbenutzerliste',
                              'user-group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              access_by_perms=['auth.add_user']
                         )
                    ]
               ),
          ]
     ),


     # FRENCH
     G3Wtree(
          'acl_fr',
          title='ACL',
          module='usermanage',
          items=[
               item(
                    'Utilisateurs',
                    'user-list',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Utilisateurs',
                              'user-list',
                              url_as_pattern=True,
                              children=[
                                   item(
                                        'Ajouter un utilisateur',
                                        'user-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                                   item(
                                        'Mise à jour utilisateur',
                                        'user-update object.pk',
                                        url_as_pattern=True,
                                        in_menu=False
                                   ),
                              ]
                         ),
                         item(
                              'Groupes',
                              'user-group-list',
                              url_as_pattern=True,
                              access_by_perms=['auth.add_user'],
                              children=[
                                   item(
                                        'Ajouter des utilisateurs de groupe',
                                        'user-group-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                              ]
                         )
                    ]
               ),
          ]
     ),

     # ROMANIAN
     G3Wtree(
          'acl_ro',
          title='ACL',
          module='usermanage',
          items=[
               item(
                    'Utilizatori',
                    'user-list',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Utilizatori',
                              'user-list',
                              url_as_pattern=True,
                              children=[
                                  item(
                                        'Add user',
                                        'user-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                                   item(
                                        'Actualizare utilizatori',
                                        'user-update object.pk',
                                        url_as_pattern=True,
                                        in_menu=False
                                   ),
                              ]
                         ),
                         item(
                              'Grupuri',
                              'user-group-list',
                              url_as_pattern=True,
                              access_by_perms=['auth.add_user'],
                              children=[
                                  item(
                                        'Adaugă utilizatori la grup',
                                        'user-group-add',
                                        url_as_pattern=True,
                                        access_by_perms=['auth.add_user'],
                                        in_menu=False
                                   ),
                              ]
                         )
                    ]
               ),
          ]
     ),
)