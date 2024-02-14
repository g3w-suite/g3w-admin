from defusedxml import ElementTree as etree
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.geos import GEOSGeometry
from core.utils.data import XmlData
import json


class GetFeatureInfoResponseLayerFeature(XmlData):
    """
    GetFeatureInfoResponse Layer Feature WMS
    """

    _dataToSet = [
        'attributes',
        'boundingBox',
        'geometry'
    ]

    _regexXmlAttributes = 'Attribute'

    def __init__(self, featureTree, **kwargs):
        self.featureTree = featureTree

        # set data value into this object
        self.setData()

    def _getDataAttributes(self):
        attributes = []

        # Get layer trees
        attributesTrees = self.featureTree.xpath(self._regexXmlAttributes)

        for order, attributeTree in enumerate(attributesTrees):

            if attributeTree.attrib['name'] == 'geometry':
                self.geometry = GEOSGeometry(attributeTree.attrib['value'])
            else:
                attributes.append({
                    'name': attributeTree.attrib['name'],
                    'value': attributeTree.attrib['value']
                })
        return attributes

    def _getDataBoundingBox(self):
        bboxTree = self.featureTree.find('BoundingBox')

        return {
            attr: bboxTree.attrib[attr] for attr in ['CRS', 'maxx', 'minx', 'maxy', 'miny']
            }

    def _getDataGeometry(self):
        return json.loads(self.geometry.json) if getattr(self, 'geometry') else None

    def asJSON(self):

        return {
            'geometry': self.geometry,
            'attributes': [attribute for attribute in self.attributes],
            'bbox': self.boundingBox
        }



class GetFeatureInfoResponseLayer(XmlData):
    """
    GetFeatureInfoResponse Layer WMS
    """

    _dataToSet = [
        'features',
    ]

    _regexXmlFeature = 'Feature'

    def __init__(self, layerTree, **kwargs):
        self.layerTree = layerTree

        # set data value into this object
        self.setData()

    def _getDataFeatures(self):
        features = []

        # Get layer trees
        featureTrees = self.layerTree.xpath(self._regexXmlFeature)

        for order, featureTree in enumerate(featureTrees):
            features.append(GetFeatureInfoResponseLayerFeature(featureTree))
        return features

    def asJSON(self):

        return {
            'features': [feature.asJSON() for feature in self.features]
        }

class GetFeatureInfoResponse(XmlData):
    """
    GetFeatureInfoResponse WMS
    """

    _dataToSet = [
        'boundingBox',
        'layers'
    ]

    _regexXmlLayer = 'Layer'

    def __init__(self, response, **kwargs):
        self.response = response

        self.loadGetFeatureResponse()

        # set data value into this object
        self.setData()

    def loadGetFeatureResponse(self):
        """
        Load from 'string'  wms response request getProjectSettings
        :return:
        """
        try:
            self.responseTree = etree.fromstring(self.response)
        except Exception as e:
            raise Exception(_('The GetFeatureResponse response is malformed: {}'.format(e.args[0])))

    def _getDataBoundingBox(self):
        bboxTree = self.responseTree.find('BoundingBox')

        return {
            attr: bboxTree.attrib[attr] for attr in ['CRS', 'maxx', 'minx', 'maxy', 'miny']
        }

    def _getDataLayers(self):
        layers = []

        # Get layer trees
        layerTrees = self.responseTree.xpath(self._regexXmlLayer)

        for order, layerTree in enumerate(layerTrees):
            layers.append(GetFeatureInfoResponseLayer(layerTree))
        return layers

    def asJSON(self):

        return {
            'bbox': self.boundingBox,
            'layers': [layer.asJSON() for layer in self.layers]
        }