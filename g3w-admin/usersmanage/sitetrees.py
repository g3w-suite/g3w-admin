from sitetree.utils import item
from core.utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

     # ITALIAN 
     G3Wtree(
          'acl',
          title='ACL',
          module='usermanage',
          items=[
                item(
                    'ACL',
                    '#',
                    type_header=True
               ),
               item(
                    'Utenti',
                    '#',
                    icon_css_class='fa fa-users',
                    children=[
                        item(
                              'Aggiungi utente',
                              'user-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-user-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Lista utenti',
                              'user-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-users'
                         ),
                         item(
                              'Agg. utente',
                              'user-update object.pk',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False
                         ),
                         item(
                              'Aggiungi gruppo utenti',
                              'user-group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['auth.add_group']
                         ),
                         item(
                              'Lista gruppi utenti',
                              'user-group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              access_by_perms=['auth.add_group']
                         )
                    ]
               ),
          ]
     ),

     # ENGLISH
     G3Wtree(
          'acl_en',
          title='ACL',
          module='usermanage',
          items=[
               item(
                    'ACL',
                    '#',
                    type_header=True
               ),
               item(
                    'Users',
                    '#',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Add user',
                              'user-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-user-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Users list',
                              'user-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-users'
                         ),
                         item(
                              'User update',
                              'user-update object.pk',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False
                         ),
                         item(
                              'Add group users',
                              'user-group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Groups users list',
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
                    'ACL',
                    '#',
                    type_header=True
               ),
               item(
                    'Utilisateurs',
                    '#',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Ajouter un utilisateur',
                              'user-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-user-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Liste des utilisateurs',
                              'user-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-users'
                         ),
                         item(
                              'Mise à jour utilisateur',
                              'user-update object.pk',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False
                         ),
                         item(
                              'Ajouter des utilisateurs de groupe',
                              'user-group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Liste des utilisateurs des groupes',
                              'user-group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              access_by_perms=['auth.add_user']
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
                    'ACL',
                    '#',
                    type_header=True
               ),
               item(
                    'Utilizatori',
                    '#',
                    icon_css_class='fa fa-users',
                    children=[
                         item(
                              'Add user',
                              'user-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-user-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Lista utilizatori',
                              'user-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-users'
                         ),
                         item(
                              'Actualizare utilizatori',
                              'user-update object.pk',
                              url_as_pattern=True,
                              icon_css_class='fa fa-edit',
                              in_menu=False
                         ),
                         item(
                              'Adaugă utilizatori la grup',
                              'user-group-add',
                              url_as_pattern=True,
                              icon_css_class='fa fa-plus',
                              access_by_perms=['auth.add_user']
                         ),
                         item(
                              'Lista grupuri de utilizatori',
                              'user-group-list',
                              url_as_pattern=True,
                              icon_css_class='fa fa-list',
                              access_by_perms=['auth.add_user']
                         )
                    ]
               ),
          ]
     ),
)