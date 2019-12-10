

class MetadataVectorLayer(object):
    """
    Object to manage metadata vector layer
    """

    def __init__(self, model, serializer, geometry_type, client_var, relation_id=None, lock=None, **kwargs):
        self.model = model
        self.serializer = serializer
        self.geometry_type = geometry_type
        self.client_var = client_var
        self.relation_id = relation_id
        self.lock = lock

        for k, v in list(kwargs.items()):
            setattr(self, k, v)

    def get_queryset(self):
        """
        Get queryset all fro current model
        """
        if hasattr(self, 'using'):
            return self.model.objects.using(self.using).all()
        else:
            return self.model.objects.all()

    def get_feature(self, pk):
        """
        Get current model instance
        """
        try:
            if hasattr(self, 'using'):
                return self.model.objects.using(self.using).get(pk=pk)
            else:
                return self.model.objects.get(pk=pk)
        except:
            return None
