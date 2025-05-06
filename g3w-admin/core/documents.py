from django_elasticsearch_dsl import Document
from django_elasticsearch_dsl.registries import registry
from .models import Group, MacroGroup, ProjectMapUrlAlias

@registry.register_document
class GroupDocument(Document):
    class Index:

        # Name of the Elasticsearch index
        name = 'groups'

        settings = {'number_of_shards': 1,
                    'number_of_replicas': 0}

    class Django:
        model = Group  # The model associated with this Document

        # The fields of the model you want to be indexed in Elasticsearch
        fields = [
            'id',
            'name',
            'title',
            'description',
        ]

@registry.register_document
class MacroGroupDocument(Document):
    class Index:

        # Name of the Elasticsearch index
        name = 'macrogroups'

        settings = {'number_of_shards': 1,
                    'number_of_replicas': 0}

    class Django:
        model = MacroGroup  # The model associated with this Document

        # The fields of the model you want to be indexed in Elasticsearch
        fields = [
            'id',
            'name',
            'title',
            'description',
        ]

@registry.register_document
class ProjectMapUrlAliasDocument(Document):
    class Index:

        # Name of the Elasticsearch index
        name = 'projectmapurlalias'

        settings = {'number_of_shards': 1,
                    'number_of_replicas': 0}

    class Django:
        model = ProjectMapUrlAlias  # The model associated with this Document

        # The fields of the model you want to be indexed in Elasticsearch
        fields = [
            'project_id',
            'alias',
        ]