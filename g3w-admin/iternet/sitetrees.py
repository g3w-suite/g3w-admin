from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
    # Define a tree with `tree` function.
    G3Wtree('iternet', title='Iternet', module='iternet', items=[
      # Then define items and their children with `item` function.
      item('ITERNET', '#', type_header=True, icon_css_class='fa fa-pie-chart'),
      item('Report', 'iternet-dashboard', url_as_pattern=True, icon_css_class='fa fa-pie-chart'),
      item('Configurazione', 'iternet-config', url_as_pattern=True, icon_css_class='fa fa-cog'),
    ]),

    G3Wtree('iternet_en', title='Iternet', module='iternet', items=[
      # Then define items and their children with `item` function.
      item('ITERNET', '#', type_header=True),
      item('Report', 'iternet-dashboard', url_as_pattern=True, icon_css_class='fa fa-pie-chart'),
      item('Configs', 'iternet-config', url_as_pattern=True, icon_css_class='fa fa-cog'),
    ]),
)

