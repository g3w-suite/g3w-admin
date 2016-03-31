from import_export import resources
from iternet.models import Archi

class ArchiResource(resources.ModelResource):
    class Meta:
        model = Archi
        import_id_fields = ('gid',)