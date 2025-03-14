from sitetree.utils import item
from core.utils.tree import G3Wtree

# Define each available `tree` within `sitetrees` variable.
# Then define each `items` through the `item` function.

sitetrees = (

    # ITALIAN 
    G3Wtree(
        'filemanager_sidebar_right_it',
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
        'filemanager_sidebar_right',
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

    # GERMAN
    G3Wtree(
        'filemanager_sidebar_right_de',
        title='STRESS Navbar',
        module='filemanager',
        items=[
            item(
                'DATEIENVERWALTUNG',
                '#',
                type_header=True
            ),
            item(
                'Dateien',
                'filemanager-home',
                icon_css_class='fa fa-database',
                description='Zur Dateiverwaltung...'
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

