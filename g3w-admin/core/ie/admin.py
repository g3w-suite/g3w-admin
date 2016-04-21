from import_export.admin import DEFAULT_FORMATS, ImportExportModelAdmin
from .formats import DBF

G3W_IE_DEFAULT_FORMATS = [format for format in DEFAULT_FORMATS]
G3W_IE_DEFAULT_FORMATS.append(DBF)


class G3WImportExportModelAdmin(ImportExportModelAdmin):

    formats = G3W_IE_DEFAULT_FORMATS