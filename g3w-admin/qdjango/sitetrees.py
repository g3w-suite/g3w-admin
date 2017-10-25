from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
  G3Wtree('qdjango', title='Qdjango', module='qdjango', items=[
      # Then define items and their children with `item` function.
      item('Aggiungi progetto QGIS {{ group.slug }}', 'qdjango-project-add group.slug', in_menu=False,
           url_as_pattern=True, icon_css_class='fa fa-plus', access_by_perms=['qdjango.add_project']),
      item('Agg. progetto QGIS {{ group.slug }} {{ object.slug }}', 'qdjango-project-update group.slug object.slug',
           in_menu=False, url_as_pattern=True, icon_css_class='fa fa-edit'),
      item('Lista strati progetto QGIS {{ group.slug }} {{ object.slug }}', 'qdjango-project-layers-list group.slug project_slug',
           in_menu=False, url_as_pattern=True, icon_css_class='fa fa-edit')
  ]),

  G3Wtree('qdjango_en', title='Qdjango', module='qdjango', items=[
      # Then define items and their children with `item` function.
      item('Add QGIS project {{ group.slug }}', 'qdjango-project-add group.slug', url_as_pattern=True,
           icon_css_class='fa fa-plus', in_menu=False ,access_by_perms=['qdjango.add_project']),
      item('Update QGIS project {{ group.slug }} {{ object.slug }}', 'qdjango-project-update group.slug object.slug',
           url_as_pattern=True, in_menu=False, icon_css_class='fa fa-edit'),
      item('Layer list QGIS project {{ group.slug }} {{ object.slug }}',
           'qdjango-project-layers-list group.slug project_slug', in_menu=False, url_as_pattern=True, icon_css_class='fa fa-edit')
  ]),


)