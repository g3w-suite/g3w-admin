# coding=utf-8
from sitetree.utils import item
from core.utils.tree import G3Wtree

sitetrees = tuple(
    G3Wtree(
        'qdjango' + (f'_{tree['lang']}' if tree['lang'] != 'en' else ''),
        title=tree['title'],
        module='qdjango',
        items=[
            item(
                tree["add_project"] + ' {{ group.slug }}',
                'qdjango-project-add group.slug',
                in_menu=False,
                url_as_pattern=True,
                icon_css_class='fa fa-plus',
                access_by_perms=['qdjango.change_projec']
            ),
            item(
                tree["update_project"] + ' {{ group.slug }} {{ object.slug }}',
                'qdjango-project-update group.slug object.slug',
                in_menu=False,
                url_as_pattern=True,
                icon_css_class='fa fa-edit'
            ),
            item(
                tree["list_layers"] + ' {{ group.slug }} {{ object.slug }}',
                'qdjango-project-layers-list group.slug project_slug',
                in_menu=False,
                url_as_pattern=True,
                icon_css_class='fa fa-edit'
            ),
            item(
                tree["list_messages"] + ' {{ group.slug }} {{ project.slug }}',
                'qdjango-project-messages-list group.slug project.slug',
                in_menu=False,
                url_as_pattern=True,
                icon_css_class='fa fa-edit'
            ),
            item(
                tree["add_message"] + ' {{ group.slug }} {{ project.slug }}',
                'qdjango-project-messages-add group.slug project.slug',
                in_menu=False,
                url_as_pattern=True,
                icon_css_class='fa fa-edit'
            ),
            item(
                tree["update_message"] + ' {{ group.slug }} {{ project.slug }}',
                'qdjango-project-messages-update group.slug project.slug object.pk',
                in_menu=False,
                url_as_pattern=True,
                icon_css_class='fa fa-edit'
            ),
        ]
    )
    for tree in [
          {
               'lang': 'it',
               'title': 'Qdjango',
               'add_project': 'Aggiungi progetto QGIS',
               'update_project': 'Agg. progetto QGIS',
               'list_layers': 'Lista strati progetto QGIS',
               'list_messages': 'Lista messaggi progetto QGIS',
               'add_message': 'Aggiungi messaggio progetto QGIS',
               'update_message': 'Agg. messaggio progetto QGIS',
          },
          {
               'lang': 'en',
               'title': 'Qdjango',
               'add_project': 'Add QGIS project',
               'update_project': 'Update QGIS project',
               'list_layers': 'Layer list QGIS project',
               'list_messages': 'QGIS project\'s messages list',
               'add_message': 'Add QGIS project\'s message',
               'update_message': 'Update QGIS project\'s message',
          },
          {
               'lang': 'fr',
               'title': 'Qdjango',
               'add_project': 'Ajouter un projet QGIS',
               'update_project': 'Mettre à jour le projet QGIS',
               'list_layers': 'Liste des messages du projet QGIS',
               'list_messages': 'Liste des messages du projet QGIS',
               'add_message': 'Ajouter un message de projet QGIS',
               'update_message': 'Mettre à jour le message du projet QGIS',
          },
     ]
)
