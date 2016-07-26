from django.contrib.gis.geos import GEOSGeometry, GEOSException
from django.contrib.gis.gdal import OGRException
from django.core.exceptions import ValidationError
from rest_framework_gis.fields import GeometryField
from shapely import wkt, geometry


class G3WGeometryField(GeometryField):
    """
    A field to handle GeoDjango Geometry fields
    """

    def to_internal_value(self, value):
        if value == '' or value is None:
            return value
        if isinstance(value, GEOSGeometry):
            # value already has the correct representation
            return value
        if isinstance(value, dict):
            value = wkt.dumps(geometry.shape(value))
        try:
            return GEOSGeometry(value)
        except (ValueError, GEOSException, OGRException, TypeError):
            raise ValidationError(_('Invalid format: string or unicode input unrecognized as GeoJSON, WKT EWKT or HEXEWKB.'))


class G3WGeoSerializerMixin(object):
    """
    Generic mixins for iternet geoserializer model
    """

    relationsAttributes = None

    def setRealtionsAttributes(self, relationsAttributeId, relationsAttributes):
        self.relationsAttributeId = relationsAttributeId
        self.relationsAttributes = relationsAttributes

    def create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance