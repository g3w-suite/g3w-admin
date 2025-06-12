from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from core.models import Group
from .models import Project, Layer

@registry.register_document
class ProjectDocument(Document):
    group = fields.ObjectField(properties={
        'id': fields.IntegerField(),
        'name': fields.TextField(),
        'title': fields.TextField()
    })

    class Index:

        # Name of the Elasticsearch index
        name = 'projects'

        settings = {'number_of_shards': 1,
                    'number_of_replicas': 0}

    class Django:
        model = Project  # The model associated with this Document

        # The fields of the model you want to be indexed in Elasticsearch
        fields = [
            'id',
            'title',
            'title_ur',
            'is_active',
            'description',
        ]

        #related_models = [Group]

