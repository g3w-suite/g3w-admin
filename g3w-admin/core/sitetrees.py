from sitetree.utils import item
from .utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('core', title='Menu', module='core', items=[
      # Then define items and their children with `item` function.
      item('MENU', '#', type_header=True),
      item('Dashboard', 'home', url_as_pattern=True, icon_css_class='fa fa-dashboard'),
      item('Cartographic groups', 'group-list', icon_css_class='fa fa-globe', children=[
          item('Add group', 'group-add', url_as_pattern=True, icon_css_class='fa fa-plus', access_by_perms=['core.add_group']),
          item('Groups list', 'group-list', url_as_pattern=True, icon_css_class='fa fa-globe', alias='group-list', in_breadcrumbs=False),
          item('Groups update {{ object.title}}', 'group-update object.slug', url_as_pattern=True, icon_css_class='fa fa-edit', alias='group-update'),
          item('Projects list {{ object.name }}', 'project-list object.slug', url_as_pattern=True, icon_css_class='fa fa-list', in_menu=False, alias='project-list')
      ]),
  ]),
)