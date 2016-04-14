from import_export import resources
from iternet.models import ElementoStradale, NumeroCivico, ToponimoStradale

class ElementoStradaleResource(resources.ModelResource):
    class Meta:
        model = ElementoStradale
        import_id_fields = ('gid',)


class NumeroCivicoResource(resources.ModelResource):
    class Meta:
        model = NumeroCivico
        import_id_fields = ('cod_civ',)


class ToponimoStradaleResource(resources.ModelResource):
    class Meta:
        model = ToponimoStradale
        import_id_fields = ('cod_top',)