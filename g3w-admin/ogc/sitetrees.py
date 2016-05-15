from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('ogc', title='OGC', module='ogc', items=[
      # Then define items and their children with `item` function.
      item('OGC', '#', type_header=True),
      item('Store', '#', icon_css_class='fa fa-globe', children=[
          item('Aggiungi store', 'ogc-store-add', url_as_pattern=True, icon_css_class='fa fa-plus',
               access_by_perms=['ogc.add_store']),
          item('Lista store', 'ogc-store-list', url_as_pattern=True, icon_css_class='fa fa-list', alias='ogc-store-list',
               in_breadcrumbs=False),
      ])
  ]),

  G3Wtree('ogc_en', title='OGC', module='ogc', items=[
      # Then define items and their children with `item` function.
      item('OGC', '#', type_header=True)
  ]),

)