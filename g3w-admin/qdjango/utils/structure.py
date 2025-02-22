import re
try:
    from osgeo import ogr
except ImportError:
    pass

from qdjango.models import Layer
from urllib.parse import urlsplit, parse_qs
from core.utils.projects import CoreMetaLayer
from core.utils import unicode2ascii
from .exceptions import QgisProjectLayerException
from qgis.core import QgsDataSourceUri, QgsProviderRegistry

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


def datasource2dict(datasource: str, provider: str) -> dict[str, str]:
    """
    Read a DB datasource string and put data in a python dict

    :param datasource: qgis project datasource
    :param provider: data provider type (key)
    :return: dict with datasource params
    :rtype: dict
    """

    # first try with the provider specific method
    parts = QgsProviderRegistry.instance().decodeUri(provider, datasource)
    if parts:
        return {k: str(v) for k, v in parts.items()}

    # data provider does not support decodeUri(), we need to process it manually
    parts = {}
    ds_uri = QgsDataSourceUri(datasource)
    for k in ds_uri.parameterKeys():
        value = ds_uri[k]
        if value:
            parts[k] = str(value)

        # special handling for "sql" parameter
        if k == "sql":
            if value:
                parts[k] = '{}'.format(unicode2ascii(value))
            else:
                parts[k] = ""

    return parts


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
