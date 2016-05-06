from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = (
  # Define a tree with `tree` function.
    G3Wtree('law', title='Laws', module='law', items=[
      # Then define items and their children with `item` function.
      item('LAW', '#', type_header=True),
      item('Normative', '#', icon_css_class='fa fa-legal', children=[
          item('Aggiungi normativa', 'law-add', url_as_pattern=True, icon_css_class='fa fa-plus'),
          item('Lista normative', 'law-list', url_as_pattern=True, icon_css_class='fa fa-list'),
          item('Lista articoli {{ law.slug }}', 'law-article-list law.slug', in_menu=False ,url_as_pattern=True, icon_css_class='fa fa-list',
               children=[
                item('Aggiungi articolo {{ law.slug }}', 'law-article-add law.slug', in_menu=False, url_as_pattern=True, icon_css_class='fa fa-plus'),
                item('Agg. articolo {{ law.slug }} {{ object.slug }}', 'law-article-update law.slug object.slug', in_menu=False, url_as_pattern=True, icon_css_class='fa fa-plus'),
          ])
      ])
    ]),

    G3Wtree('law_en', title='Laws', module='law', items=[
        # Then define items and their children with `item` function.
        item('LAW', '#', type_header=True),
        item('Laws', '#', icon_css_class='fa fa-legal', children=[
            item('Add law', 'law-add', url_as_pattern=True, icon_css_class='fa fa-plus'),
            item('Laws list', 'law-list', url_as_pattern=True, icon_css_class='fa fa-list'),
            item('Articles list {{ law.slug }}', 'law-article-list law.slug', in_menu=False, url_as_pattern=True,
                 icon_css_class='fa fa-list',
                 children=[
                     item('Article add {{ law.slug }}', 'law-article-add law.slug', in_menu=False, url_as_pattern=True,
                          icon_css_class='fa fa-plus'),
                     item('Article update {{ law.slug }} {{ object.slug }}', 'law-article-update law.slug object.slug',
                          in_menu=False, url_as_pattern=True, icon_css_class='fa fa-plus'),
                 ])
        ])
    ]),


)

