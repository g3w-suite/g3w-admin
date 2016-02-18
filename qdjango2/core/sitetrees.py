from sitetree.utils import item
from core.utils.tree import qdjango2tree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  qdjango2tree('main', title='Menu', module='core', items=[
      # Then define items and their children with `item` function.
      item('MENU', '#', type_header=True),
      item('Gruppi cartografici', 'group-list', url_as_pattern=True ,icon_css_class='fa fa-globe'),
      item('Controlli', '#', icon_css_class='fa fa-wrench')
  ]),
)