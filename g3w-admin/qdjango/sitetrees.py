from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('qdjango', title='Qdjango', module='qdjango', items=[
      # Then define items and their children with `item` function.
      item('Add qdjango project {{ group.slug }}', 'qdjango-project-add group.slug', url_as_pattern=True, icon_css_class='fa fa-plus'),

  ]),
)