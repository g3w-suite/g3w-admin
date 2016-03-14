from django.conf import settings
from defusedxml import lxml
from django.utils.translation import ugettext, ugettext_lazy as _
from core.utils.general import *
from django.db import transaction
from qdjango.models import Project
from .structure import *
import os, re
import json


def makeDatasource(datasource,layerType):
    """
    Rebuild datasource on qgjango/g3w-admin settings
    :param datasource:
    :param layerType:
    :return: string, new datasource
    """
    newDatasource = None
    # Path and folder name
    basePath = settings.DATASOURCE_PATH.rstrip('/') # eg: /home/sit/charts
    folder = os.path.basename(basePath) # eg: charts
    # OGR example datasource:
    # Original: <datasource>\\SIT-SERVER\sit\charts\definitivo\d262120.shp</datasource>
    # Modified: <datasource>/home/sit/charts\definitivo\d262120.shp</datasource>
    if layerType == Layer.TYPES.ogr or layerType == Layer.TYPES.gdal:
        newDatasource = re.sub(r'(.*?)%s(.*)' % folder, r'%s\2' % basePath, datasource) # ``?`` means ungreedy

    # SpatiaLite example datasource:
    # Original: <datasource>dbname='//SIT-SERVER/sit/charts/Carte stradali\\naturalearth_110m_physical.sqlite' table="ne_110m_glaciated_areas" (geom) sql=</datasource>
    # Modified: <datasource>dbname='/home/sit/charts/Carte stradali\\naturalearth_110m_physical.sqlite' table="ne_110m_glaciated_areas" (geom) sql=</datasource>
    if layerType == Layer.TYPES.spatialite:
        oldPath = re.sub(r"(.*)dbname='(.*?)'(.*)", r"\2", datasource) # eg: "//SIT-SERVER/sit/charts/Carte stradali\\naturalearth_110m_physical.sqlite"
        newPath = re.sub(r'(.*?)%s(.*)' % folder, r'%s\2' % basePath, oldPath) # eg: "\home\sit\charts/Carte stradali\\naturalearth_110m_physical.sqlite" (``?`` means ungreedy)
        newDatasource = datasource.replace(oldPath, newPath)

    return newDatasource


class QgisData(object):

     _dataToSet = []

     _introMessageException = ''


     def setData(self):
        """
        Set data project to self object
        """
        for data in self._dataToSet:
            try:
                setattr(self,data,getattr(self,'_getData{}'.format(ucfirst(data)))())
            except Exception as e:
                raise Exception(_('{} "{}" {}:'.format(self._introMessageException,data,e.message)))




class QgisProjectLayer(QgisData):
    """
    Qgisdata obejct for layer project: a layer xml wrapper
    """

    _dataToSet = [
        'name',
        'layerId',
        'isVisible',
        'title',
        'layerType',
        'datasource',
        'columns'
    ]

    _introMessageException = 'Missing or invalid layer data'

    def __init__(self, layerTree, **kwargs):
        self.qgisProjectLayerTree = layerTree

        if 'qgisProject' in kwargs:
            self.qgisProject = kwargs['qgisProject']

        if 'order' in kwargs:
            self.order = kwargs['order']

        # set data value into this object
        self.setData()


    def _getDataName(self):
        """
        Get name tag content from xml
        :return: string
        """
        return self.qgisProjectLayerTree.find('layername').text

    def _getDataLayerId(self):
        """
        Get name tag content from xml
        :return: string
        """
        return self.qgisProjectLayerTree.find('id').text

    def _getDataTitle(self):
        """
        Get title tag content from xml
        :return: string
        """
        try:
            layer_title = self.qgisProjectLayerTree.find('title').text
        except:
            layer_title = ''

        if layer_title == None:
            layer_title = ''

        return layer_title


    def _getDataIsVisible(self):
        """
        Get if is visible form xml
        :return: string
        """
        legendTrees = self.qgisProject.qgisProjectTree.find('legend')
        legends = legendTrees.iterdescendants(tag='legendlayerfile')

        for legend in legends:
            if legend.attrib['layerid'] == self.layerId:
                if legend.attrib['visible'] == '1':
                    return True
                else:
                    return False

    def _getDataLayerType(self):
        """
        Get name tag content from xml
        :return: string
        """
        availableTypes = [item[0] for item in Layer.TYPES]
        layerType = self.qgisProjectLayerTree.find('provider').text
        if not layerType in availableTypes:
            raise Exception(_('Missing or invalid type for layer')+' "%s"' % self.name)
        return layerType


    def _getDataDatasource(self):
        """
        Get name tag content from xml
        :return: string
        """
        datasource = self.qgisProjectLayerTree.find('datasource').text
        serverDatasource = makeDatasource(datasource,self.layerType)

        if serverDatasource is not None:
            return serverDatasource
        else:
            return datasource

    def _getDataColumns(self):
        """
        Retrive data about columns for db table or ogr lyer type
        :return:
        """
        if self.layerType in [Layer.TYPES.postgres,Layer.TYPES.spatialite]:
            layerStructure = QgisDBLayerStructure(self, layerType=self.layerType)
        elif self.layerType in [Layer.TYPES.ogr]:
            layerStructure = QgisOGRLayerStructure(self)

        if len(layerStructure.columns) > 0:
            layerStructure.columns += self._getLayerJoinedColumns()

        return layerStructure.columns


    def _getLayerJoinedColumns(self):

        joined_columns = []
        try:
            joins = self.qgisProjectLayerTree.find('vectorjoins')
            for join in joins:
                join_id = join.attrib['joinLayerId']

                # prendo l'elemento parent di un tag "id" dove il testo corrisponde al nome del layer
                joined_layer = self.qgisProjectLayerTree.getroottree().xpath('//id[text()="'+join_id+'"]/..')[0]
                joined_columns += []
        except Exception,e:
            pass
        return joined_columns

    def save(self):
        """
        Save o update layer instance into db
        :param instance:
        :param kwargs:
        :return:
        """

        columns = json.dumps(self.columns)

        self.instance, created = Layer.objects.get_or_create(
            name=self.name,
            project=self.qgisProject.instance,
            defaults={
                'title': self.title,
                'is_visible': self.isVisible,
                'layer_type': self.layerType,
                'database_columns': columns,
                'datasource': self.datasource,
                'order': self.order,
                }
            )
        if not created:
            self.instance.title = self.title
            self.instance.is_visible = self.isVisible
            self.instance.layer_type = self.self.layerType
            self.instance.datasource = self.datasource
            self.instance.database_columns = columns
            self.instance.order = self.order
        # Save self.instance
        self.instance.save()


class QgisProjectValidator(object):
    """
    A simple qgis project validator call clean method
    """
    def __init__(self, qgisProject):
        self.qgisProject = qgisProject

    def clean(self):
       pass


class IsGroupCompatibleValidator(QgisProjectValidator):
    """
    Check il project is compatible with own group
    """
    def clean(self):
        if self.qgisProject.group.srid != self.qgisProject.srid:
            raise Exception(_('Project and group SRID must be the same'))
        if self.qgisProject.group.units != self.qgisProject.units:
            raise Exception(_('Project and group units must be the same'))


class ProjectExists(QgisProjectValidator):
    """
    Check il project exixts in database
    """
    def clean(self):
        from qdjango.models import Project
        if Project.objects.filter(title=self.qgisProject.title).exists():
            raise Exception(_('A project with the same title already exists'))



class QgisProject(QgisData):
    """
    A qgis xml project file wrapper
    """
    _dataToSet = [
        'name',
        'title',
        'srid',
        'units',
        'initialExtent',
        'layers',
        'qgisVersion'
        ]

    _defaultValidators = [
        IsGroupCompatibleValidator
    ]

    _regexXmlLayer = 'projectlayers/maplayer[@geometry!="No geometry"]'

    _introMessageException = _('Invalid Project Data ')

    def __init__(self, qgis_file, **kwargs):
        self.qgisProjectFile = qgis_file
        self.validators = []
        self.instance = None

        #istance of a model Project
        if 'instance' in kwargs:
            self.instance = kwargs['instance']

        if 'group' in kwargs:
            self.group = kwargs['group']


        # try to load xml project file
        self.loadProject()

        # set data value into this object
        self.setData()

        #register defaul validator
        for validator in self._defaultValidators:
            self.registerValidator(validator)

    def loadProject(self):
        """
        Load projectfile by xml parser
        """
        try:

            # we have to rewind the underlying file in case it has been already parsed
            self.qgisProjectFile.file.seek(0)
            self.qgisProjectTree = lxml.parse(self.qgisProjectFile, forbid_entities=False)
        except Exception as e:
            raise Exception(_('The project file is malformed: {}'.format(e.message)))


    def _getDataName(self):
        """
        Get projectname from xml
        :return: string
        """
        return self.qgisProjectTree.getroot().attrib['projectname']

    def _getDataTitle(self):
        """
        Get title tag content from xml
        :return: string
        """
        return self.qgisProjectTree.find('title').text

    def _getDataInitialExtent(self):
        """
        Get start extention project from xml
        :return: dict
        """
        return {
            'xmin': self.qgisProjectTree.find('mapcanvas/extent/xmin').text,
            'ymin': self.qgisProjectTree.find('mapcanvas/extent/ymin').text,
            'xmax': self.qgisProjectTree.find('mapcanvas/extent/xmax').text,
            'ymax': self.qgisProjectTree.find('mapcanvas/extent/ymax').text
        }

    def _getDataSrid(self):
        """

        :return:
        """
        return int(self.qgisProjectTree.find('mapcanvas/destinationsrs/spatialrefsys/srid').text)

    def _getDataUnits(self):
        return self.qgisProjectTree.find('mapcanvas/units').text

    def _checkLayerTypeCompatible(self,layerTree):
        """
        Chek il layer is compatible for to show in webgis
        :param layerTree:
        :return:
        """
        if 'name' in layerTree.attrib:
            if layerTree.attrib['name'] == 'openlayers':
                return False
        if 'embedded' in layerTree.attrib:
            if layerTree.attrib['embedded'] == '1':
                return False
        return True

    def _getDataLayers(self):
        layers = []

        # Get legend tree
        legendTree = self.qgisProjectTree.find('legend')

        # Get layer trees
        layerTrees = self.qgisProjectTree.xpath(self._regexXmlLayer)

        for order,layerTree in enumerate(layerTrees):
            if self._checkLayerTypeCompatible(layerTree):
                layers.append(QgisProjectLayer(layerTree, qgisProject=self, order=order))

        return layers

    def _getDataQgisVersion(self):
        return self.qgisProjectTree.getroot().attrib['version']

    def clean(self):
        for validator in self.validators:
            validator.clean()


    def registerValidator(self,validator):
        """
        Register a QgisProjectValidator object
        :param validator: QgisProjectValidator
        :return: None
        """
        self.validators.append(validator(self))

    def save(self,instance=None, **kwargs):
        """
        Save or update  qgisporject and layers into db
        :param instance: Project instance
        """

        thumbnail = kwargs.get('thumbnail')
        description = kwargs.get('description','')

        with transaction.atomic():
            if not instance and not self.instance:
                self.instance = Project.objects.create(
                    qgis_file=self.qgisProjectFile,
                    group=self.group,
                    title=self.title,
                    initial_extent=self.initialExtent,
                    thumbnail= thumbnail,
                    description=description,
                    qgis_version=self.qgisVersion
                )
            else:
                if instance:
                    self.instance = instance
                self.instance.qgis_file = self.qgisProjectFile
                self.instance.title = self.title
                self.instance.qgis_version = self.qgisVersion
                self.instance.initial_extent = self.initialExtent

                if thumbnail:
                    self.instance.thumbnail = thumbnail
                if description:
                    self.instance.description = description

                self.instance.save()

            # Create or update layers
            for layer in self.layers:
                layer.save()

            # Pre-existing layers that have not been updated must be dropped
            newLayerNameList = [layer.name for layer in self.layers]
            for layer in self.instance.layer_set.all():
                if layer.name not in newLayerNameList:
                    layer.delete()

            # Update qgis file datasource for SpatiaLite and OGR layers
            self.updateQgisFileDatasource()

    def updateQgisFileDatasource(self):
        """Update qgis file datasource for SpatiaLite and OGR layers.

        SpatiaLite and OGR layers need their datasource string to be
        modified at import time so that the original path is replaced with
        the DjangoQGIS one (which is stored in ``settings.py`` as variable
        ``DATASOURCE_PATH``).

        Example original datasource::

        <datasource>\\SIT-SERVER\sit\charts\definitivo\d262120.shp</datasource>

        Example modified datasource::

        <datasource>/home/sit/charts\definitivo\d262120.shp</datasource>
        """

        # Parse the file and build the XML tree
        self.instance.qgis_file.file.seek(0)
        tree = lxml.parse(self.instance.qgis_file, forbid_entities=False)

        # Run through the layer trees
        for layer in tree.xpath(self._regexXmlLayer):
            if self._checkLayerTypeCompatible(layer):
                layerType = layer.find('provider').text
                datasource = layer.find('datasource').text

                newDatasource = makeDatasource(datasource,layerType)

                # Update layer
                if newDatasource:
                    layer.find('datasource').text = newDatasource

        # Update QGIS file
        with open(self.instance.qgis_file.path, 'w') as handler:
            tree.write(handler)






