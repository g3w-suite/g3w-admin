from import_export import resources
from iternet.models import ElementoStradale, NumeroCivico

class ElementoStradaleResource(resources.ModelResource):
    class Meta:
        model = ElementoStradale
        import_id_fields = ('gid',)


class NumeroCivicoResource(resources.ModelResource):
    class Meta:
        model = NumeroCivico
        import_id_fields = ('cod_civ',)