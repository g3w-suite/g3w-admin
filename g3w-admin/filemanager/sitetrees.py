from sitetree.utils import item
from core.utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

    # ITALIAN 
    G3Wtree(
        'filemanager_sidebar_right',
        title='File Manager sidebar right',
        module='filemanager',
        items=[
            item(
                'File',
                'filemanager-home',
                icon_css_class='fa fa-database',
                description='Accedi al gestore di file'
            ),
        ]
    ),

    # ENGLISH
    G3Wtree(
        'filemanager_sidebar_right_en',
        title='STRESS navabar',
        module='filemanager',
        items=[
            item(
                'Files',
                'filemanager-home',
                icon_css_class='fa fa-database',
                description='Go to file manager application'
            ),
        ]
    ),

    # FRENCH
    G3Wtree(
        'filemanager_sidebar_right_fr',
        title='STRESS navabar',
        module='filemanager',
        items=[
            item(
                'Files',
                'filemanager-home',
                icon_css_class='fa fa-database',
                description='Allez dans l\'application du gestionnaire de fichiers'
            ),
        ]
    ),

    # ROMANIAN
    G3Wtree(
        'filemanager_sidebar_right_ro',
        title='STRESS navabar',
        module='filemanager',
        items=[
            item(
                'Fișiere',
                'filemanager-home',
                icon_css_class='fa fa-database',
                description='Deschide aplicația de gestionare fișiere'
            ),
        ]
    ),
)

