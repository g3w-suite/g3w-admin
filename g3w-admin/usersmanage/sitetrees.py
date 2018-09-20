from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('acl', title='ACL', module='usermanage', items=[
      # Then define items and their children with `item` function.
      item('ACL', '#', type_header=True),
      item('Utenti', '#', icon_css_class='fa fa-users', children=[
          item('Aggiungi utente', 'user-add', url_as_pattern=True, icon_css_class='fa fa-user-plus', access_by_perms=['auth.add_user']),
          item('Lista utenti', 'user-list', url_as_pattern=True, icon_css_class='fa fa-users'),
          item('Agg. utente', 'user-update object.pk', url_as_pattern=True, icon_css_class='fa fa-edit', in_menu=False),
          item('Aggiungi gruppo utenti', 'user-group-add', url_as_pattern=True, icon_css_class='fa fa-plus'),
          item('Lista gruppi utenti', 'user-group-list', url_as_pattern=True, icon_css_class='fa fa-list')
      ]),
  ]),

  G3Wtree('acl_en', title='ACL', module='usermanage', items=[
      # Then define items and their children with `item` function.
      item('ACL', '#', type_header=True),
      item('Users', '#', icon_css_class='fa fa-users', children=[
          item('Add user', 'user-add', url_as_pattern=True, icon_css_class='fa fa-user-plus',
               access_by_perms=['auth.add_user']),
          item('Users list', 'user-list', url_as_pattern=True, icon_css_class='fa fa-users'),
          item('User update', 'user-update object.pk', url_as_pattern=True, icon_css_class='fa fa-edit', in_menu=False),
          item('Add group users', 'user-group-add', url_as_pattern=True, icon_css_class='fa fa-plus'),
          item('Groups users list', 'user-group-list', url_as_pattern=True, icon_css_class='fa fa-list')
      ]),
  ]),
)