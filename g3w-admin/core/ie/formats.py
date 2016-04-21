from import_export.formats.base_formats import TextFormat


class DBF(TextFormat):
    TABLIB_MODULE = 'tablib.formats._dbf'
    CONTENT_TYPE = 'application/dbase'

    def get_extension(self):
        return 'dbf'
