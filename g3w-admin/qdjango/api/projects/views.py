from rest_framework.views import APIView
from core.utils.db import build_dango_connection_name, build_django_connection, dictfetchall
from qdjango.utils.structure import datasource2dict
from .permissions import ProjectRelationPermission
from qdjango.models.projects import Project

class QdjangoProjectRelationsApiView(APIView):
    """
    Return list of relations rows
    """

    #FIXME: doing with QGIS api
    permission_classes = [
        ProjectRelationPermission
    ]

    def get(self, request, format=None, group_slug=None, project_id=None, relation_id=None, relation_field_value=None):

        # get Project model object:
        project = Project.objects.get(pk=project_id)

        # ty to get project relations and if fail layer relations
        try:
            relations = {r['id']: r for r in eval(project.relations)}
            relation = relations[relation_id]
        except Exception as e:

            # try to get layer relations
            layer_id = relation_id.split('_vectorjoin_')[0]
            layer = project.layer_set.filter(qgs_layer_id=layer_id)[0]
            joins = eval(layer.vectorjoins)
            for n, join in enumerate(joins):
                serialized_relation = serialize_vectorjoin(layer.qgs_layer_id, n, join)
                if serialized_relation['id'] == relation_id:
                    relation = serialized_relation

        # get layer for query:
        referencing_layer = Layer.objects.get(qgs_layer_id=relation['referencingLayer'], project=project)

        # database columns referencing_layer
        db_columns_referencing_layer = referencing_layer.database_columns_by_name() \
            if referencing_layer.database_columns else None

        exclude_columns = eval(referencing_layer.exclude_attribute_wms) \
            if referencing_layer.exclude_attribute_wms else None

        # build using connection name
        datasource = datasource2dict(referencing_layer.datasource)
        using = build_dango_connection_name(referencing_layer.datasource)
        connections.databases[using] = build_django_connection(datasource, layer_type=referencing_layer.layer_type)

        # exec raw query
        # todo: better

        # BUILD DATA QUERY
        # check if relation_field_value is null
        if relation_field_value.upper() == 'NULL':
            relation_field_value = 'null'
        else:
            if db_columns_referencing_layer \
                    and relation['fieldRef']['referencingField'] in db_columns_referencing_layer:
                db_column_referencing_field = db_columns_referencing_layer[relation['fieldRef']['referencingField']]
                if db_column_referencing_field['type'] in (
                        'INTEGER', 'BIGINT', 'SMALLINT', 'NUMERIC', 'REAL', 'INTEGER64', 'DOUBLE'):
                    relation_field_value = "{}".format(relation_field_value)
                else:
                    relation_field_value = "'{}'".format(relation_field_value)
            else:
                if relation_field_value.isnumeric():
                    relation_field_value = "{}".format(relation_field_value)
                else:
                    relation_field_value = "'{}'".format(relation_field_value)

        # check if there is a schema
        schema_table = datasource['table'].split('.')
        if len(schema_table) > 1:
            referencing_field = '{}."{}"'.format(schema_table[1], relation['fieldRef']['referencingField'])
        else:
            referencing_field = '"{}"'.format(relation['fieldRef']['referencingField'])

        with connections[using].cursor() as cursor:
            cursor.execute("SELECT * FROM {} WHERE {} {} {}".format(
                datasource['table'],
                referencing_field,
                '=' if relation_field_value != 'null' else 'IS',
                relation_field_value))
            rows = dictfetchall(cursor)

        rowss = []
        for r in rows:
            rn = r.copy()
            new_rn = OrderedDict()
            for f in list(r.keys()):
                if type(r[f]) == memoryview or f in ['the_geom', 'geom']:
                    continue
                elif exclude_columns and f in exclude_columns:
                    continue
                if db_columns_referencing_layer and f in db_columns_referencing_layer:
                    new_rn[db_columns_referencing_layer[f]['label']] = rn[f]
                else:
                    new_rn[f] = rn[f]
            rowss.append(new_rn)

        # remove new db connection
        del connections.databases[using]

        return Response(rowss)
