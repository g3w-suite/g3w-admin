from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('law', title='Laws', module='law', items=[
      # Then define items and their children with `item` function.
      item('LAW', '#', type_header=True),
      item('Laws', '#', icon_css_class='fa fa-legal', children=[
          #item('Add qdjango project {{ group.slug }}', 'qdjango-project-add group.slug', url_as_pattern=True, icon_css_class='fa fa-plus'),
          #item('Update qdjango project {{ group.slug }} {{ object.slug }}', 'qdjango-project-update group.slug object.slug', url_as_pattern=True, icon_css_class='fa fa-edit'),
          item('Laws list', 'law-list', url_as_pattern=True, icon_css_class='fa fa-list')
      ])
  ]),
)