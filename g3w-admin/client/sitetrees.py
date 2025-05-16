from sitetree.utils import item
from core.utils.tree import G3Wtree

# Be sure you defined `sitetrees` in your module.
sitetrees = tuple(
    G3Wtree(
        'client' + (f'_{tree['lang']}' if tree['lang'] != 'en' else ''),
        title=tree['title'],
        module='client',
        items=[
            item(
                'G3W-CLIENT',
                '#',
                type_header=True
            ),
            item(
                tree['branch_manager'],
                'client-branch-manager',
                icon_css_class='fa fa-code-fork',
                url_as_pattern=True,
                in_menu=True,
                access_by_perms=['qdjango.change_project'],
            ),
        ]
    ) for tree in [
        {
            'lang': 'en',
            'title': 'G3W-CLIENT',
            'branch_manager': 'Branch (beta)',
        },
        # {
        #     'lang': 'it',
        #     'title': 'G3W-CLIENT',
        #     'branch_manager': 'Branch (beta)',
        # },
    ]
)