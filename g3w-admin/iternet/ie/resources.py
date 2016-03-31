from import_export import resources
from iternet.models import ElementoStradale

class ElementoStradaleResource(resources.ModelResource):
    class Meta:
        model = ElementoStradale
        import_id_fields = ('gid',)