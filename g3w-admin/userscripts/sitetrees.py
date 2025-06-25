from sitetree.utils import item
from core.utils.tree import G3Wtree

sitetrees = tuple(
    G3Wtree(
        'userscripts' + (f'_{tree['lang']}' if tree['lang'] != 'en' else ''),
        title=tree['title'],
        module='userscripts',
        items=[
            item(
                tree['list'],
                'userscripts:list',
                icon_css_class='fa fa-scissors fa-border bg-gray',
                in_breadcrumbs=True,
                url_as_pattern=True,
                children=[
                    item(
                        tree['add'],
                        'userscripts:add',
                        access_by_perms=['qdjango.change_project'],
                        in_menu=False,
                    ),
                    item(
                        tree['update'] + ' {{ object.title}}',
                        'userscripts:update object.pk',
                        in_menu=False,
                        alias='userscript-update'
                    ),
                ]
            ),
        ]
    )
    for tree in [
        {
            'lang': 'en',
            'title': 'UserScripts',
            'list': 'Code snippets',
            'add': 'Add script',
            'update': 'Update script',
        },
        {
            'lang': 'it',
            'title': 'UserScripts',
            'list': 'Code snippets',
            'add': 'Aggiungi script',
            'update': 'Aggiorna script',
        },
    ]
)
