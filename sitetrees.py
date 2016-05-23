from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
    # Define a tree with `tree` function.
    G3Wtree('cdu', title='Cdu', module='cdu', items=[
      # Then define items and their children with `item` function.
      item('CDU', '#', type_header=True),
      item('Profili CDU', '#', icon_css_class='fa fa-cog', children=[
        item('Aggiungi profilo', 'cdu-config-add', url_as_pattern=True, icon_css_class='fa fa-plus'),
        item('Lista profili', 'cdu-config-list', url_as_pattern=True, icon_css_class='fa fa-list')
      ]),
    ]),

    G3Wtree('cdu_en', title='Cdu', module='cdu', items=[
        # Then define items and their children with `item` function.
        item('CDU', '#', type_header=True),
        item('CDU Configs', '#', icon_css_class='fa fa-cog', children=[
            item('Add config', 'cdu-config-add', url_as_pattern=True, icon_css_class='fa fa-plus'),
            item('Configs list', 'cdu-config-list', url_as_pattern=True, icon_css_class='fa fa-list')
        ]),
    ]),
)

