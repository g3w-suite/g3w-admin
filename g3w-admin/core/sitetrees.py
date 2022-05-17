from sitetree.utils import item
from .utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
    G3Wtree('core', title='Menu', module='core', items=[
        # Then define items and their children with `item` function.
        item('MENU', '#', type_header=True),
        item('Scrivania', 'home', url_as_pattern=True, icon_css_class='fa fa-dashboard'),
        item('Gruppi cartografici', 'group-list', icon_css_class='fa fa-globe', children=[
            item('Aggiungi gruppo', 'group-add', url_as_pattern=True, icon_css_class='fa fa-plus',
                 access_by_perms=['core.add_group']),
            item('Lista gruppi', 'group-list', url_as_pattern=True, icon_css_class='fa fa-globe', alias='group-list',
                 in_breadcrumbs=True),
            item('Agg. gruppo {{ object.title}}', 'group-update object.slug', url_as_pattern=True,
                 icon_css_class='fa fa-edit', in_menu=False, alias='group-update'),
            item('Lista progetti {{ group.name }}', 'project-list group.slug', url_as_pattern=True,
                 icon_css_class='fa fa-list', in_menu=False, in_breadcrumbs=True, alias='project-list'),
        ]),
        item('Macro Gruppi cartografici', 'macrogroup-list', access_by_perms=['core.add_macrogroup'],
             icon_css_class='fa fa-globe', children=[
            item('Aggiungi MACRO gruppo', 'macrogroup-add', url_as_pattern=True, icon_css_class='fa fa-plus',
                 access_by_perms=['core.add_macrogroup']),
            item('Lista MACRO gruppi', 'macrogroup-list', url_as_pattern=True, icon_css_class='fa fa-globe',
                 alias='macrogroup-list', in_breadcrumbs=True),
        ]),
    ]),

    G3Wtree('core_en', title='Menu', module='core', items=[
      # Then define items and their children with `item` function.
        item('MENU', '#', type_header=True),
        item('Dashboard', 'home', url_as_pattern=True, icon_css_class='fa fa-dashboard'),
        item('Cartographic groups', 'group-list', icon_css_class='fa fa-globe', children=[
          item('Add group', 'group-add', url_as_pattern=True, icon_css_class='fa fa-plus', access_by_perms=['core.add_group']),
          item('Groups list', 'group-list', url_as_pattern=True, icon_css_class='fa fa-globe', alias='group-list', in_breadcrumbs=False),
          item('Groups update {{ object.title}}', 'group-update object.slug', url_as_pattern=True, icon_css_class='fa fa-edit', in_menu=False, alias='group-update'),
          item('Projects list {{ group.name }}', 'project-list group.slug', url_as_pattern=True, icon_css_class='fa fa-list', in_menu=False, alias='project-list')
        ]),
        item('Macro Cartographic groups', 'macrogroup-list', access_by_perms=['core.add_macrogroup'],
            icon_css_class='fa fa-globe', children=[
            item('Add MACRO group', 'macrogroup-add', url_as_pattern=True, icon_css_class='fa fa-plus',
                 access_by_perms=['core.add_macrogroup']),
            item('MACRO groups list', 'macrogroup-list', url_as_pattern=True, icon_css_class='fa fa-globe',
                 alias='macrogroup-list', in_breadcrumbs=True),
            ]),
    ]),

    G3Wtree('core_fr', title='Menu', module='core', items=[
      # Then define items and their children with `item` function.
        item('MENU', '#', type_header=True),
        item('Bureau', 'home', url_as_pattern=True, icon_css_class='fa fa-dashboard'),
        item('Groupes cartographiques', 'group-list', icon_css_class='fa fa-globe', children=[
          item('Ajouter un groupe', 'group-add', url_as_pattern=True, icon_css_class='fa fa-plus', access_by_perms=['core.add_group']),
          item('Liste des groupes', 'group-list', url_as_pattern=True, icon_css_class='fa fa-globe', alias='group-list', in_breadcrumbs=False),
          item('Mise à jour du groupe {{ object.title}}', 'group-update object.slug', url_as_pattern=True, icon_css_class='fa fa-edit', in_menu=False, alias='group-update'),
          item('Liste des projets {{ group.name }}', 'project-list group.slug', url_as_pattern=True, icon_css_class='fa fa-list', in_menu=False, alias='project-list')
        ]),
        item('Groupes macro-cartographiques', 'macrogroup-list', access_by_perms=['core.add_macrogroup'],
            icon_css_class='fa fa-globe', children=[
            item('Ajouter un groupe MACRO', 'macrogroup-add', url_as_pattern=True, icon_css_class='fa fa-plus',
                 access_by_perms=['core.add_macrogroup']),
            item('Liste des groupes MACRO', 'macrogroup-list', url_as_pattern=True, icon_css_class='fa fa-globe',
                 alias='macrogroup-list', in_breadcrumbs=True),
            ]),
    ]),

    G3Wtree('core_ro', title='Menu', module='core', items=[
      # Then define items and their children with `item` function.
        item('MENU', '#', type_header=True),
        item('Tablou de bord', 'home', url_as_pattern=True, icon_css_class='fa fa-dashboard'),
        item('Grupuri cartografice', 'group-list', icon_css_class='fa fa-globe', children=[
          item('Adaugă grup', 'group-add', url_as_pattern=True, icon_css_class='fa fa-plus', access_by_perms=['core.add_group']),
          item('Listă grupuri', 'group-list', url_as_pattern=True, icon_css_class='fa fa-globe', alias='group-list', in_breadcrumbs=False),
          item('Groups update {{ object.title}}', 'group-update object.slug', url_as_pattern=True, icon_css_class='fa fa-edit', in_menu=False, alias='group-update'),
          item('Lista proiecte {{ group.name }}', 'project-list group.slug', url_as_pattern=True, icon_css_class='fa fa-list', in_menu=False, alias='project-list')
        ]),
        item('Grupuri MACRO Cartografice', 'macrogroup-list', access_by_perms=['core.add_macrogroup'],
            icon_css_class='fa fa-globe', children=[
            item('Adaugă grup MACRO', 'macrogroup-add', url_as_pattern=True, icon_css_class='fa fa-plus',
                 access_by_perms=['core.add_macrogroup']),
            item('Lista grupuri MACRO', 'macrogroup-list', url_as_pattern=True, icon_css_class='fa fa-globe',
                 alias='macrogroup-list', in_breadcrumbs=True),
            ]),
    ])
)
