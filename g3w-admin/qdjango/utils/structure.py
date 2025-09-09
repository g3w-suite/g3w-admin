import re
try:
    from osgeo import ogr
except ImportError:
    pass

from qdjango.models import Layer
from urllib.parse import urlsplit, parse_qs
from core.utils.projects import CoreMetaLayer
from core.utils import unicode2ascii
from core.utils.structure import mapLayerAttributes
from .exceptions import QgisProjectLayerException
from qgis.core import QgsDataSourceUri

import requests

# "schema"."table"
RE1 = re.compile(r'"([^"]+)"\."([^"]+)"')
# schema.table
RE2 = re.compile(r'([^"\.]+)\.(.+)')
# "table" or table
RE3 = re.compile(r'"?([^"]+)"?')

def get_schema_table(datasource_table):
    """Returns unquoted schema and table names

    :param datasource_table: table description
    :type datasource_table: str
    :return: tuple with unquoted schema and table names
    :rtype: tuple
    """

    try:
        return RE1.match(datasource_table).groups()
    except AttributeError:
        try:
            return RE2.match(datasource_table).groups()
        except AttributeError:
            table = RE3.match(datasource_table).groups()[0]
            schema = 'public'
    return schema, table


def qgsdatasourceuri2dict(datasource: str) -> dict:
    """
    From QgsDatasourceUri to dict
    At now only for postgres type layer

    :param qgsdsuri: Instace fo QgsDatasourceUri
    :return: a dict with uri parameters
    :return type: dict
    """

    qgsdsuri = QgsDataSourceUri(datasource)

    # Mapping from QgsDatasourceUri to g3w-admin parameters
    params = {
        'database': 'dbname',
        'host': 'host',
        'password': 'password',
        'port': 'port',
        'sslMode': 'sslmode',
        'username': 'user',
        'keyColumn': 'key',
        'srid': 'srid',
        'table': 'table',
        'sql': 'sql',
        'schema': 'schema'
    }

    toret = {}
    for k, v in params.items():
        if k == 'sql':
            toret[v] = unicode2ascii(getattr(qgsdsuri, k)())
        elif k == 'sslMode':
            print(qgsdsuri.sslMode())
            toret[v] = qgsdsuri.encodeSslMode(qgsdsuri.sslMode())
        toret[v] = getattr(qgsdsuri, k)()

    return toret


def datasource2dict(datasource):
    """
    Read a DB datasource string and put data in a python dict

    :param datasource: qgis project datasource
    :return: dict with datasource params
    :rtype: dict
    """

    datasourceDict = {}

    # before get sql
    try:
        datasource, sql = datasource.split('sql=')
    except:
        sql = None

    keys = re.findall(r'([A-z][A-z0-9-_]+)=[\'"]?[#$^?+=!*()\'-/@%&\w\."]+[\'"]?', datasource)
    for k in keys:
        try:
            datasourceDict[k] = re.findall(r'%s=([^"\'][#$^?+=!*()\'-/@%%&\w\.]+|\d)' % k, datasource)[0]
        except:
            # If I reincarnate as a human, I'll choose to be a farmer.
            datasourceDict[k] = re.findall(r'%s=((?:["\'](?:(?:[^\"\']|\\\')+)["\'])(?:\.["\'](?:(?:[^\"\']|\\\')+)["\'])?)(?:\s|$)' % k, datasource)[0].strip('\'')

    # add sql
    if sql:
        datasourceDict['sql'] = '{}'.format(unicode2ascii(sql))
    else:
        datasourceDict['sql'] = ''
    return datasourceDict


def datasourcearcgis2dict(datasource):
    """
    Read a ArcGisMapServer datasource string and put data in a python dict

    :param datasource: qgis project arcgis layer datasource
    :return: dict with datasource params
    :rtype: dict
    """

    datasourcedict = {}

    keys = re.findall(r'([A-z][A-z0-9-_]+)=[\'"]?[#$^?+=!*()\'-/@%&\w\."]+[\'"]?', datasource)
    for k in keys:
        try:
            datasourcedict[k] = re.findall(r'{}=[\'"]([#$:_^?+=!*()\'-/@%&\w\."]+)[\'"]'.format(k), datasource)[0]
        except:
            pass

    return datasourcedict


class QdjangoMetaLayer(CoreMetaLayer):
    """
    Metalayer used for belonging layers group activations/deactivations image map by client tree toc
    I.e.:
    Layer 1 (Metalayer value 1)
    Layer 2 (Metalayer value 1)
    Layer 3 (Metalayer value 2)
    Layer 4 (Metalayer value 3)
    Layer 1 and 2 work as a group also for Layer 3 another group and Layer 4
    """
    layerTypesSingleLayer = (
        'wms',
    )

    def getCurrentByLayer(self, layer):
        """
        Get current metalayer value by qdjango layer type
        """

        self.countLayer += 1
        layerType = layer['source']['type']

        if layerType in self.layerTypesSingleLayer and 'url' in layer['source'] and layer['source']['external']\
                or 'cache_url' in layer:
            if self.countLayer > 1:
                self.increment()
            self.toIncrement = True
        elif self.toIncrement:
            self.increment()
            self.toIncrement = False

        return self.current


from copy import deepcopy


def apply_tree_patch(original_tree, patch_tree):
    """
    Apply a patch (tree structure) to an existing tree, modifying nodes by 'id' or 'name'.

    This function traverses the original tree, and for each node in the patch:
    - If it contains an 'id', it updates the matching node's properties.
    - If it doesn't contain an 'id' but contains a 'name', it updates the matching group's properties.

    Args:
        original_tree (list): The original tree structure (list of dicts).
        patch_tree (list): The patch tree, where nodes may include full or partial updates.

    Returns:
        list: A deep-copied and updated version of the original tree with the patch applied.
    """

    def apply_patch(original_nodes, patch_nodes):
        for patch in patch_nodes:
            patch_id = patch.get("id")
            patch_name = patch.get("name")

            if patch_id:
                # Update node by ID
                def update_node_by_id(nodes):
                    for node in nodes:
                        if node.get("id") == patch_id:
                            for key, value in patch.items():
                                if key != "id":
                                    node[key] = value
                            return True
                        if "nodes" in node:
                            if update_node_by_id(node["nodes"]):
                                return True
                    return False

                update_node_by_id(original_nodes)

            elif patch_name:
                # Update node by name (group-level node)
                def update_node_by_name(nodes):
                    for node in nodes:
                        if node.get("name") == patch_name:
                            for key, value in patch.items():
                                if key not in ("id", "nodes"):
                                    node[key] = value
                            if "nodes" in patch and "nodes" in node:
                                apply_patch(node["nodes"], patch["nodes"])
                            return True
                    return False

                update_node_by_name(original_nodes)

    updated_tree = deepcopy(original_tree)
    apply_patch(updated_tree, patch_tree)
    return updated_tree


def get_attributes(layer, style=None, request=None):
    """
    Get attributes for layer by style if style is not None

    :param layer: Layer instance
    :param style: Style name (optional)
    :param request: Request object (optional)
    :return: List of attributes
    """

    columns = mapLayerAttributes(
            layer, style=style) if layer.database_columns else []

    # evaluate fields to show or not by qgis project
    column_to_exclude = eval(layer.exclude_attribute_wms) if layer.exclude_attribute_wms else []

    if request:
        visible_columns = layer.visible_fields_for_user(request.user)
        for column in columns:
            column['show'] = (column['name'] in visible_columns) and (
                column['name'] not in column_to_exclude)
    else:
        for column in columns:
            column['show'] = False if column['name'] in column_to_exclude else True

    return columns
    