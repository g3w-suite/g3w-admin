# coding=utf-8
from sitetree.utils import item
from core.utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

    # ITALIAN
    G3Wtree(
          'qdjango_it',
          title='Qdjango',
          module='qdjango',
          items=[
               item(
                    'Aggiungi progetto QGIS {{ group.slug }}',
                    'qdjango-project-add group.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-plus',
                    access_by_perms=['qdjango.add_project']
               ),
               item(
                    'Agg. progetto QGIS {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-update group.slug object.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Lista strati progetto QGIS {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-layers-list group.slug project_slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Lista messaggi progetto QGIS {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-list group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Aggiungi messaggio progetto QGIS {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-add group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Agg. messaggio progetto QGIS {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-update group.slug project.slug object.pk',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               )
          ]
     ),

     # ENGLISH
     G3Wtree(
          'qdjango',
          title='Qdjango',
          module='qdjango',
          items=[
               item(
                    'Add QGIS project {{ group.slug }}',
                    'qdjango-project-add group.slug',
                    url_as_pattern=True,
                    icon_css_class='fa fa-plus',
                    in_menu=False,
                    access_by_perms=['qdjango.add_project']
               ),
               item(
                    'Update QGIS project {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-update group.slug object.slug',
                    url_as_pattern=True,
                    in_menu=False,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Layer list QGIS project {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-layers-list group.slug project_slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'QGIS project\'s messages list {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-list group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Add QGIS project\'s message {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-add group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Update QGIS project\'s message {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-update group.slug project.slug object.pk',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               )
          ]
     ),

     # FRENCH
     G3Wtree(
          'qdjango_fr',
          title='Qdjango',
          module='qdjango',
          items=[
               item(
                    'Ajouter un projet QGIS {{ group.slug }}',
                    'qdjango-project-add group.slug',
                    url_as_pattern=True,
                    icon_css_class='fa fa-plus',
                    in_menu=False,
                    access_by_perms=['qdjango.add_project']
               ),
               item(
                    'Mettre à jour le projet QGIS {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-update group.slug object.slug',
                    url_as_pattern=True,
                    in_menu=False,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Liste des messages du projet QGIS {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-layers-list group.slug project_slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Liste des messages du projet QGIS {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-list group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Ajouter un message de projet QGIS {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-add group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Mettre à jour le message du projet QGIS {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-update group.slug project.slug object.pk',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               )
          ]
     ),

     # BULGARIAN
     G3Wtree(
          'qdjango',
          title='Qdjango',
          module='qdjango',
          items=[
               item(
                    'Добави QGIS проект {{ group.slug }}',
                    'qdjango-project-add group.slug',
                    url_as_pattern=True,
                    icon_css_class='fa fa-plus',
                    in_menu=False,
                    access_by_perms=['qdjango.add_project']
               ),
               item(
                    'Обнови QGIS проект {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-update group.slug object.slug',
                    url_as_pattern=True,
                    in_menu=False,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Списък слоеве в QGIS проект {{ group.slug }} {{ object.slug }}',
                    'qdjango-project-layers-list group.slug project_slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Съобщения в QGIS проект {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-list group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Добави съобщение в QGIS проект {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-add group.slug project.slug',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               ),
               item(
                    'Обнови съобщение в QGIS проект {{ group.slug }} {{ project.slug }}',
                    'qdjango-project-messages-update group.slug project.slug object.pk',
                    in_menu=False,
                    url_as_pattern=True,
                    icon_css_class='fa fa-edit'
               )
          ]
     ),

)
