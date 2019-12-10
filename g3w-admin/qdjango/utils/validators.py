from qdjango.models import Layer
from django.utils.translation import ugettext, ugettext_lazy as _
from core.utils.data import isXML
from .exceptions import QgisProjectException, QgisProjectLayerException
import re
import os


class QgisValidator(object):
    """
    Interface for Qgis object validators
    """
    def clean(self):
        pass


class QgisProjectValidator(QgisValidator):
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
        if self.qgisProject.group.srid.srid != self.qgisProject.srid:
            raise QgisProjectException(_('Project SRID (%s) and group SRID (%s) must be the same') % (self.qgisProject.srid, self.qgisProject.group.srid.srid))


class ProjectExists(QgisProjectValidator):
    """
    Check if project exists in database
    """
    def clean(self):
        from qdjango.models import Project
        if Project.objects.filter(title=self.qgisProject.title).exists():
            raise QgisProjectException(_('A project with the same title already exists'))



class ProjectTitleExists(QgisProjectValidator):
    """
    Check if project title exists
    """
    def clean(self):
        if not self.qgisProject.title:
            if self.qgisProject.qgisProjectFile.name:
                self.qgisProject.title = self.qgisProject.qgisProjectFile.name
            else:
                raise QgisProjectException(_('Title project not empty'))


class UniqueLayername(QgisProjectValidator):
    """
    Check if laeryname is unique inside a project
    """
    def clean(self):
        layers = []
        for layer in self.qgisProject.layers:
            if layer.name in layers:
                raise QgisProjectException(_('More than one layer with same name/shortname: {}'.format(layer.name)))
            layers.append(layer.name)


class CheckMaxExtent(QgisProjectValidator):
    """
    Check il WMSExtent is correct
    """
    def clean(self):
        max_extent = self.qgisProject.maxExtent

        if max_extent:

            # cast coord to float
            for c in ['xmin', 'xmax', 'ymin', 'ymax']:
                max_extent[c] = float(max_extent[c])

            # check is a cordinate il None or empty
            wrong_coord = list()
            for coord, value in list(max_extent.items()):
                if not value:
                    wrong_coord.append(coord)

            if len(wrong_coord) > 0:
                raise QgisProjectException(
                    _('Check WMS start extent project property: {} didn\'t set'.format(','.join(wrong_coord))))

            # check calue are correct inside angles coordinates
            err_msg_x = err_msg_y = ''
            if max_extent['xmax'] < max_extent['xmin']:
                err_msg_x = _('xmax smaller then xmin ')
            if max_extent['ymax'] < max_extent['ymin']:
                err_msg_y = _('ymax smaller then ymin ')

            if err_msg_x or err_msg_y:
                raise QgisProjectException('Check WMS start extent project property: {}{}'.format(err_msg_x, err_msg_y))


class QgisProjectLayerValidator(QgisValidator):
    """
    A simple qgis project layer validator call clean method
    """

    def __init__(self, qgisProjectLayer):
        self.qgisProjectLayer = qgisProjectLayer

    def clean(self):
        pass


class DatasourceExists(QgisProjectLayerValidator):
    """
    Check if layer datasource exists on server
    """
    def clean(self):
        if self.qgisProjectLayer.layerType in [Layer.TYPES.gdal, Layer.TYPES.ogr, Layer.TYPES.raster]:
            if self.qgisProjectLayer.layerType != Layer.TYPES.gdal or not isXML(self.qgisProjectLayer.datasource):
                if not os.path.exists(self.qgisProjectLayer.datasource.split('|')[0]):
                    err = ugettext('Missing data file for layer {} '.format(self.qgisProjectLayer.name))
                    err += ugettext('which should be located at {}'.format(self.qgisProjectLayer.datasource))
                    raise QgisProjectLayerException(err)


class ColumnName(QgisProjectLayerValidator):
    """
    Check column data name: no whitespace, no special chars.
    """
    def clean(self):
        if self.qgisProjectLayer.layerType in [Layer.TYPES.ogr, Layer.TYPES.postgres, Layer.TYPES.spatialite]:
            columns_err = []
            for column in self.qgisProjectLayer.columns:
                # search
                #rex = '[^A-Za-z0-9]+'
                rex = '[;:,%@$^&*!#()\[\]\{\}\\n\\r\\s]+'
                if re.search(rex, column['name']):
                    columns_err.append(column['name'])
            if columns_err:
                err = ugettext('The follow fields name of layer {} contains '
                               'white spaces and/or special characters: {}')\
                    .format(self.qgisProjectLayer.name, ', '.join(columns_err))
                err += ugettext('Please use \'Alias\' fields in QGIS project')
                raise QgisProjectLayerException(err)
