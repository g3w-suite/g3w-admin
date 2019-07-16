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
from urlparse import urlsplit, parse_qs
from core.utils.projects import CoreMetaLayer
from core.utils import unicode2ascii
from .exceptions import QgisProjectLayerException
import shlex


def get_schema_table(datasource_table):
    if datasource_table.find('.') != -1:
        schema, table = datasource_table.split('.')
    else:
        schema = 'public'
        table = datasource_table

    table = table.strip('"')
    schema = schema.strip('"')

    return schema, table


def datasource2dict(datasource):
    """
    Read a DB datasource string and put data in a python dict
    """

    datasourceDict = {}

    # before get sql
    datasource, sql = datasource.split('sql=')
    #datalist = datasource.split(' ')
    datalist = shlex.split(datasource)
    for item in datalist:
        try:
            key, value = item.split('=')
            datasourceDict[key] = value.strip('\'')
        except ValueError:
            pass

    # add sql
    datasourceDict['sql'] = '{}'.format(unicode2ascii(sql))
    return datasourceDict


class QdjangoMetaLayer(CoreMetaLayer):

    layerTypesSingleLayer = (
        'wms',
    )

    def getCurrentByLayer(self, layer):
        """
        Get current metalayer value by qdjango layer type
        """

        self.countLayer += 1
        layerType = layer['source']['type']

        if layerType in self.layerTypesSingleLayer and 'url' in layer['source'] or 'cache_url' in layer:
            if self.countLayer > 1:
                self.increment()
            self.toIncrement = True
        elif self.toIncrement:
            self.increment()
            self.toIncrement = False

        return self.current


class QgisLayerStructure(object):

    def __init__(self, layer, **kwargs):
        self.layer = layer
        self.datasource = layer.datasource
        self.layerType = layer.layerType
        self.datasourceDict = {}
        self.columns = []

        self._errDatasourceNotFound = _('Missing data file for layer') + ' "{}"'
        self._errDatasourceNotFound += _('which should be located at') + ' "{}"'

    def getTableColumns(self):
        pass

    '''
    def clearColumn(self, column_name):
        """
        Get column name and remove special characters like , ; : ecc.
        Sub blankspace with underscore
        :param column_name:
        :return:
        """

        # remove
        column_name = re.sub('[;:,%@$^&*!#()\[\]\{\}\\n\\r]+', '', column_name)

        # replace whitespaces
        column_name = re.sub('\s', '_', column_name)

        return column_name
    '''


class QgisOGRLayerStructure(QgisLayerStructure):

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
        Get table column info from ogr layer by gdal python lib
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


class QgisDBLayerStructure(QgisLayerStructure):

    _dbTypes = {
        Layer.TYPES.postgres: 'postgresql+psycopg2',
        Layer.TYPES.spatialite: 'sqlite'
    }

    def __init__(self, layer, **kwargs):
        super(QgisDBLayerStructure, self).__init__(layer, **kwargs)

        if not self.layerType in self._dbTypes.keys():
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
        Chheck il spatilite fiel exists
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