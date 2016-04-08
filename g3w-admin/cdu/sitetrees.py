from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('cdu', title='Cdu', module='cdu', items=[
      # Then define items and their children with `item` function.
      item('CDU', '#', type_header=True),
      item('Configs', 'cdu-config', url_as_pattern=True, icon_css_class='fa fa-cog'),
  ]),
)

