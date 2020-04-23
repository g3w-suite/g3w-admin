from sqlalchemy import create_engine
from geoalchemy2 import Table as GEOTable
from sqlalchemy.engine.url import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import MetaData
from django.utils.translation import ugettext_lazy as _
import os, re
try:
    from osgeo import ogr
except ImportError:
    pass

from qdjango.models import Layer
from urllib.parse import urlsplit, parse_qs
from core.utils.projects import CoreMetaLayer
from core.utils import unicode2ascii
from .exceptions import QgisProjectLayerException
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
            datasourceDict[k] = re.findall(r'%s=((?:["\'](?:(?:[^\"\']|\\\')+)["\'])(?:\.["\'](?:(?:[^\"\']|\\\')+)["\'])?)\s' % k, datasource)[0].strip('\'')

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


class QgisLayerStructure(object):
    """ Base calss for data structure """
    def __init__(self, layer, **kwargs):
        self.layer = layer
        self.datasource = layer.datasource
        self.layerType = layer.layerType
        self.datasourceDict = {}
        self.columns = []

        self._errDatasourceNotFound = _('Missing data file for layer') + ' "{}"'
        self._errDatasourceNotFound += _('which should be located at') + ' "{}"'

    def getTableColumns(self):
        """ Main method """
        pass


class QgisOGRLayerStructure(QgisLayerStructure):
    """
    Get OGR layer type columns structure.
    For shapefile ond other file types ogr supported.
    """

    def __init__(self, layer, **kwargs):
        super(QgisOGRLayerStructure, self).__init__(layer, **kwargs)

        # check datasource
        self._cleanDataSource()

        # get table columns
        self.getTableColumns()

    def _cleanDataSource(self):
        """
        Check if ogr data layer exists
        """
        if not os.path.exists(self.datasource):
            raise Exception(self._errDatasourceNotFound.format(self.layer.name, self.datasource))

    def getTableColumns(self):
        """
        Get table column info from ogr layer by gdal python lib and set into self.columns property
        """
        dataSourceOgr = ogr.Open(self.datasource)
        daLayer = dataSourceOgr.GetLayer(0)
        layerDefinition = daLayer.GetLayerDefn()

        for i in range(layerDefinition.GetFieldCount()):
            self.columns.append({
                'name': layerDefinition.GetFieldDefn(i).GetName(),
                'type': layerDefinition.GetFieldDefn(i).GetFieldTypeName(layerDefinition.GetFieldDefn(i).GetType())
                    .upper(),
                'label': layerDefinition.GetFieldDefn(i).GetName()
            })

        dataSourceOgr.Destroy()


class QgisAFSLayerStructure(QgisLayerStructure):
    """
    Get ArcGisFeatureServer layer type columns structure.
    """
    #todo:: to study better

    def __init__(self, layer, **kwargs):
        super(QgisAFSLayerStructure, self).__init__(layer, **kwargs)

        # get table columns
        self.getTableColumns()

    def getTableColumns(self):
        """
        Get table column info
        """
        capabilitiesAfs = requests.get('{}?f=json'.format(datasourcearcgis2dict(self.datasource)['url']))

        if capabilitiesAfs.status_code == 200:
            res = capabilitiesAfs.json()
            if 'fields' in res:
                for f in res['fields']:
                    self.columns.append({
                        'name': f['name'],
                        'type': f['type'].upper(),
                        'label': f['alias']
                    })

        del(capabilitiesAfs)


class QgisDBLayerStructure(QgisLayerStructure):
    """ Class to analyze and get db data structure """

    _dbTypes = {
        Layer.TYPES.postgres: 'postgresql+psycopg2',
        Layer.TYPES.spatialite: 'sqlite'
    }

    def __init__(self, layer, **kwargs):
        super(QgisDBLayerStructure, self).__init__(layer, **kwargs)

        if not self.layerType in list(self._dbTypes.keys()):
            raise Exception('Database Layer Type not available in qdjango module: {}'.format(self.layerType))

        self._datasource2dict()

        # check datasource
        self._cleanDataSource()

        # get driver for geoalchemy
        getattr(self, 'getDriver_{}'.format(self.layerType))()

        # get table columns
        self.getTableColumns()

    def _cleanDataSource(self):
        """
        Check il spatialite field exists
        """

        if self.layerType == Layer.TYPES.spatialite:
            if not os.path.exists(self.datasourceDict['dbname']):
                raise QgisProjectLayerException(self._errDatasourceNotFound.format(self.layer.name,self.datasource))


    def _datasource2dict(self):
        """
        Read datasource string e put data in a python dict
        """

        self.datasourceDict = datasource2dict(self.datasource)


    def getSchemaTable(self):
        """
        Get and set in self sttributes value of table and schema
        """

        self.schema, self.table = get_schema_table(self.datasourceDict['table'])

    def getDriver_postgres(self):
        """
        Get URL connection for sqlite postgresql+postgis2
        """

        self.getSchemaTable()
        # Connection url
        self.urlDB = URL(
            self._dbTypes[self.layerType],
            self.datasourceDict['user'],
            self.datasourceDict['password'],
            self.datasourceDict['host'],
            self.datasourceDict['port'],
            self.datasourceDict['dbname']
        )

    def getDriver_spatialite(self):
        """
        Get URL connection for sqlite geoalchemy
        """

        self.urlDB = URL(self._dbTypes[self.layerType], database=self.datasourceDict['dbname'])
        self.table = self.datasourceDict['table'].strip('"')
        self.schema = None

    def getTableColumns(self):

        # Some SQLAlchemy magic
        Base = declarative_base()
        engine = create_engine(self.urlDB, echo=False)
        Session = sessionmaker(bind=engine)
        session = Session()
        meta = MetaData(bind=engine)
        messages = GEOTable(
            self.table, meta, autoload=True, autoload_with=engine, schema=self.schema
            )

        for c in messages.columns:
            try:
                self.columns.append({'name': c.name, 'type': str(c.type), 'label': c.name})
            except NotImplementedError:
                pass


class QgisCSVLayerStructure(QgisLayerStructure):
    """ Class to analyze and get data csv structure """

    def __init__(self, layer, **kwargs):
        super(QgisCSVLayerStructure, self).__init__(layer, **kwargs)

        self._datasource2dict()

        # check datasource
        self._cleanDataSource()

        # get table columns
        self.getTableColumns()

    def _datasource2dict(self):
        """
        Read datasource string e put data in a python dict
        """

        self.datasourceDict = {}
        file = re.sub(r"(.*)file:(.*?)", r"\2", self.datasource)
        urldata = urlsplit(file)

        self.datasourceDict['file'] = urldata.path
        self.datasourceDict.update(parse_qs(urldata.query))


    def _cleanDataSource(self):
        """
        Check if ogr data layer exisists
        """
        if not os.path.exists(self.datasourceDict['file']):
            raise QgisProjectLayerException(self._errDatasourceNotFound.format(self.layer.name, self.datasourceDict['file']))

    def getTableColumns(self):
        """
        Get table column info from ogr layer by gdal python lib
        """
        dataSourceOgr = ogr.Open(self.datasourceDict['file'])
        daLayer = dataSourceOgr.GetLayer(0)
        layerDefinition = daLayer.GetLayerDefn()

        for i in range(layerDefinition.GetFieldCount()):
            self.columns.append({
                'name': layerDefinition.GetFieldDefn(i).GetName(),
                'type': layerDefinition.GetFieldDefn(i).GetFieldTypeName(layerDefinition.GetFieldDefn(i).GetType())
                    .upper(),
                'label': layerDefinition.GetFieldDefn(i).GetName()
            })

        dataSourceOgr.Destroy()