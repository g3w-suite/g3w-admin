from sitetree.utils import item
from core.utils.tree import G3Wtree

sitetrees = tuple(
    G3Wtree(
        'acl' + (f'_{tree['lang']}' if tree['lang'] != 'en' else ''),
        title=tree['title'],
        module='usermanage',
        items=[
            item(
                tree['users'],
                'user-list',
                icon_css_class='fa fa-users',
                children=[
                    item(
                        tree['users'],
                        'user-list',
                        url_as_pattern=True,
                        children=[
                            item(
                                tree['add_user'],
                                'user-add',
                                url_as_pattern=True,
                                access_by_perms=['auth.add_user'],
                                in_menu=False
                            ),
                            item(
                                tree['update_user'],
                                'user-update object.pk',
                                url_as_pattern=True,
                                in_menu=False
                            ),
                        ]
                    ),
                    item(
                        tree['groups'],
                        'user-group-list',
                        url_as_pattern=True,
                        access_by_perms=['auth.add_user'],
                        children=[
                            item(
                                tree['add_group'],
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
    )
    for tree in [
          {
               'lang': 'it',
               'title': 'ACL',
               'users': 'Utenti',
               'add_user': 'Aggiungi utente',
               'update_user': 'Agg. utente',
               'groups': 'Gruppi',
               'add_group': 'Aggiungi gruppo utenti',
          },
          {
               'lang': 'en',
               'title': 'ACL',
               'users': 'Users',
               'add_user': 'Add user',
               'update_user': 'User update',
               'groups': 'Groups',
               'add_group': 'Add group users',
          },
          {
               'lang': 'de',
               'title': 'ACL',
               'users': 'Benutzerliste',
               'add_user': 'Benutzer hinzufügen',
               'update_user': 'Benutzeraktualisierung',
               'groups': 'Gruppenbenutzerliste',
               'add_group': 'Add group users',
          },
          {
               'lang': 'fr',
               'title': 'ACL',
               'users': 'Utilisateurs',
               'add_user': 'Ajouter un utilisateur',
               'update_user': 'Mise à jour utilisateur',
               'groups': 'Groupes',
               'add_group': 'Ajouter des utilisateurs de groupe',
          },
          {
               'lang': 'ro',
               'title': 'ACL',
               'users': 'Utilizatori',
               'add_user': 'Add user',
               'update_user': 'Actualizare utilizatori',
               'groups': 'Grupuri',
               'add_group': 'Adaugă utilizatori la grup',
          },
     ]
)