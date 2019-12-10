"""
Code by https://bitbucket.org/springmeyer/django-shapes/src/45ae08527182291f363121f48e8881a34358c1c3/shapes/views/export.py?at=default&fileviewer=file-view-default
"""
import os
import zipfile
import tempfile
import datetime
from io import StringIO
from django.http import HttpResponse
from django.utils.encoding import smart_str
from django.db.models.fields import *
from django.db.models.fields.related import ForeignKey
from django.contrib.gis.db.models.fields import GeometryField
from django.contrib.gis.gdal import check_err, OGRGeomType
except ImportError:

try:
    # a mysterious bug with ctypes and python26 causes crashes
    # when calling lgdal.OGR_DS_CreateLayer, so we default to
    # using the native python bindings to ogr/gdal if they exist
    # thanks Jared K, for reporting this bug and submitting an alternative approach
    from osgeo import ogr, osr
    HAS_NATIVE_BINDINGS = True
except ImportError:
    HAS_NATIVE_BINDINGS = False
    from django.contrib.gis.gdal.libgdal import lgdal
    from django.contrib.gis.gdal import Driver, OGRGeometry, OGRGeomType, SpatialReference, check_err, CoordTransform



class ShpResponder(object):
    def __init__(self, queryset, readme=None, geo_field=None,
                 proj_transform=None, mimetype='application/zip',
                 file_name='shp_download', exclude=None):
        self.queryset = queryset
        self.readme = readme
        self.geo_field = geo_field
        self.proj_transform = proj_transform
        self.mimetype = mimetype
        self.file_name = smart_str(file_name)
        self.exclude_fields = exclude or []
        self.dbf_streams = []

    def __call__(self, *args, **kwargs):
        """
        Method that gets called when the ShpResponder class is used as a view.

        Example
        -------

        from shapes import ShpResponder

        shp_response = ShpResponder(Model.objects.all(),proj_transform=900913,file_name=u"fo\xf6.txt")

        urlpatterns = patterns('',
            (r'^export_shp/$', shp_response),
            )

        """

        tmp = self.write_shapefile_to_tmp_file(self.queryset)
        return self.zip_response(tmp,self.file_name,self.mimetype,self.readme)

    def get_attributes(self):
        # Todo: control field order as param
        fields = self.queryset.model._meta.fields
        attr = [
            f for f in fields
            if not isinstance(f, GeometryField) and \
                f.name not in self.exclude_fields
        ]
        return attr

    def get_geo_field(self):
        fields = self.queryset.model._meta.fields
        geo_fields = [f for f in fields if isinstance(f, GeometryField)]
        geo_fields_names = ', '.join([f.name for f in geo_fields])


        if len(geo_fields) > 1:
            if not self.geo_field:
                raise ValueError("More than one geodjango geometry field found, please specify which to use by name using the 'geo_field' keyword. Available fields are: '%s'" % geo_fields_names)
            else:
                geo_field_by_name = [fld for fld in geo_fields if fld.name == self.geo_field]
                if not geo_field_by_name:
                    raise ValueError("Geodjango geometry field not found with the name '%s', fields available are: '%s'" % (self.geo_field,geo_fields_names))
                else:
                    geo_field = geo_field_by_name[0]
        elif geo_fields:
            geo_field = geo_fields[0]
        else:
            raise ValueError('No geodjango geometry fields found in this model queryset')

        return geo_field


    def write_shapefile_to_tmp_file(self,queryset):
        tmp = tempfile.NamedTemporaryFile(suffix='.shp', mode = 'w+b')
        # we must close the file for GDAL to be able to open and write to it
        tmp.close()
        args = tmp.name, queryset, self.get_geo_field()

        if HAS_NATIVE_BINDINGS:
            self.write_with_native_bindings(*args)
        else:
            self.write_with_ctypes_bindings(*args)
        return tmp.name

    def zip_response(self,shapefile_path,file_name,mimetype,readme=None):
        buffer = StringIO()
        zip = zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED)
        files = ['shp','shx','prj','dbf']
        for item in files:
            filename = '%s.%s' % (shapefile_path.replace('.shp',''), item)
            zip.write(filename, arcname='%s.%s' % (file_name.replace('.shp',''), item))
        if readme:
            zip.writestr('README.txt',readme)
        for dbf_stream in self.dbf_streams:
            zip.writestr(dbf_stream['name'], dbf_stream['stream'])
        zip.close()
        buffer.flush()
        zip_stream = buffer.getvalue()
        buffer.close()

        # Stick it all in a django HttpResponse
        response = HttpResponse()
        response['Content-Disposition'] = 'attachment; filename=%s.zip' % file_name.replace('.shp','')
        response['Content-length'] = str(len(zip_stream))
        response['Content-Type'] = mimetype
        response.write(zip_stream)
        return response

    def write_with_native_bindings(self,tmp_name,queryset,geo_field):
        """ Write a shapefile out to a file from a geoqueryset.

        Written by Jared Kibele and Dane Springmeyer.

        In this case we use the python bindings available with a build
        of gdal when compiled with --with-python, instead of the ctypes-based
        bindings that GeoDjango provides.

        """

        dr = ogr.GetDriverByName('ESRI Shapefile')
        ds = dr.CreateDataSource(tmp_name)
        if ds is None:
            raise Exception('Could not create file!')

        if hasattr(geo_field,'geom_type'):
            ogr_type = OGRGeomType(geo_field.geom_type).num
        else:
            ogr_type = OGRGeomType(geo_field._geom).num

        native_srs = osr.SpatialReference()
        if hasattr(geo_field,'srid'):
            native_srs.ImportFromEPSG(geo_field.srid)
        else:
            native_srs.ImportFromEPSG(geo_field._srid)

        if self.proj_transform:
            output_srs = osr.SpatialReference()
            output_srs.ImportFromEPSG(self.proj_transform)
        else:
            output_srs = native_srs

        layer = ds.CreateLayer('lyr',srs=output_srs,geom_type=ogr_type)

        attributes = self.get_attributes()

        for field in attributes:
            # map django field type to OGR type
            field_defn = self.map_ogr_types(field)
            if layer.CreateField(field_defn) != 0:
                raise Exception('Failed to create field')

        feature_def = layer.GetLayerDefn()

        for item in queryset:
            feat = ogr.Feature(feature_def)

            for field in attributes:
                # if the field is a foreign key, return its pk value. this is
                # a problem when a model is given a __str__ representation.
                value = getattr(item, field.name)
                if value is not None and isinstance(field, ForeignKey):
                    value = getattr(value, 'pk')
                if isinstance(value, str):
                    value = value.encode('utf-8')

                # truncate the field name.
                # TODO: handle nonunique truncated field names.
                feat.SetField(str(field.name[0:10]),value)

            geom = getattr(item,geo_field.name)

            if geom:
                ogr_geom = ogr.CreateGeometryFromWkt(geom.wkt)
                if self.proj_transform:
                    ct = osr.CoordinateTransformation(native_srs, output_srs)
                    ogr_geom.Transform(ct)
                check_err(feat.SetGeometry(ogr_geom))
            else:
                pass

            check_err(layer.CreateFeature(feat))

        ds.Destroy()

    def write_with_ctypes_bindings(self,tmp_name,queryset,geo_field):
        """ Write a shapefile out to a file from a geoqueryset.

        Uses GeoDjangos ctypes wrapper to ogr in libgdal.

        """

        # Get the shapefile driver
        dr = Driver('ESRI Shapefile')

        # Creating the datasource
        ds = lgdal.OGR_Dr_CreateDataSource(dr._ptr, tmp_name, None)
        if ds is None:
            raise Exception('Could not create file!')

        # Get the right geometry type number for ogr
        if hasattr(geo_field,'geom_type'):
            ogr_type = OGRGeomType(geo_field.geom_type).num
        else:
            ogr_type = OGRGeomType(geo_field._geom).num

        # Set up the native spatial reference of the geometry field using the srid
        if hasattr(geo_field,'srid'):
            native_srs = SpatialReference(geo_field.srid)
        else:
            native_srs = SpatialReference(geo_field._srid)

        if self.proj_transform:
            output_srs = SpatialReference(self.proj_transform)
        else:
            output_srs = native_srs

        # create the layer
        # this is crashing python26 on osx and ubuntu
        layer = lgdal.OGR_DS_CreateLayer(ds, 'lyr', output_srs._ptr, ogr_type, None)

        # Create the fields
        attributes = self.get_attributes()

        for field in attributes:
            fld = lgdal.OGR_Fld_Create(str(field.name), 4)
            added = lgdal.OGR_L_CreateField(layer, fld, 0)
            check_err(added)

        # Getting the Layer feature definition.
        feature_def = lgdal.OGR_L_GetLayerDefn(layer)

        # Loop through queryset creating features
        for item in self.queryset:
            feat = lgdal.OGR_F_Create(feature_def)

            # For now, set all fields as strings
            # TODO: catch model types and convert to ogr fields
            # http://www.gdal.org/ogr/classOGRFeature.html

            # OGR_F_SetFieldDouble
            #OFTReal => FloatField DecimalField

            # OGR_F_SetFieldInteger
            #OFTInteger => IntegerField

            #OGR_F_SetFieldStrin
            #OFTString => CharField


            # OGR_F_SetFieldDateTime()
            #OFTDateTime => DateTimeField
            #OFTDate => TimeField
            #OFTDate => DateField

            for idx,field in enumerate(attributes):
                value = getattr(item,field.name)
                try:
                    string_value = str(value)
                except UnicodeEncodeError as e:
                    # pass for now....
                    # http://trac.osgeo.org/gdal/ticket/882
                    string_value = ''
                lgdal.OGR_F_SetFieldString(feat, idx, string_value)

            # Transforming & setting the geometry
            geom = getattr(item,geo_field.name)

            # if requested we transform the input geometry
            # to match the shapefiles projection 'to-be'
            if geom:
                ogr_geom = OGRGeometry(geom.wkt,output_srs)
                if self.proj_transform:
                    ct = CoordTransform(native_srs, output_srs)
                    ogr_geom.transform(ct)
                # create the geometry
                check_err(lgdal.OGR_F_SetGeometry(feat, ogr_geom._ptr))
            else:
                # Case where geometry object is not found because of null value for field
                # effectively looses whole record in shapefile if geometry does not exist
                pass

            # creat the feature in the layer.
            check_err(lgdal.OGR_L_SetFeature(layer, feat))

        # Cleaning up
        check_err(lgdal.OGR_L_SyncToDisk(layer))
        lgdal.OGR_DS_Destroy(ds)
        lgdal.OGRCleanupAll()

    def map_ogr_types(self,field,precision=6,width=255):
        """Map Django field type to OGR field type.
        FieldDefn = map_ogr_types(Field field, int precision=6, int width=255)

        Arguments:
        field -- field in a Django model to map to an OGR data type
        Keyword Arguments:
        precision -- float precision.
        width -- width of string fields.
        """

        # Map Django field types to OGR types.
        ogr_mapping = {AutoField:ogr.OFTInteger,
                       BooleanField:ogr.OFTString,
                       IntegerField:ogr.OFTInteger,
                       PositiveIntegerField:ogr.OFTInteger,
                       DateField:ogr.OFTDate,
                       DateTimeField:ogr.OFTDateTime,
                       FloatField:ogr.OFTReal,
                       TextField:ogr.OFTString,
                       CharField:ogr.OFTString}

        # Dereference a foreign key if necessary.
        while isinstance(field,ForeignKey):
            for f in field.rel.to._meta.fields:
                if f.attname == field.rel.field_name:
                    # Don't overwrite the field name! Just interested in the type.
                    _name = field.name
                    field = f
                    field.name = _name
                    break

        # Truncate the field name.
        shpname = field.name[0:10]

        # Set the OGR field type
        try:
            ogr_type = ogr_mapping[type(field)]
        except KeyError:
            # If the class isn't directly mapped, see if any parent classes are
            # mapped (useful for custom Django field types that are just (eg)
            # CharFields under the hood).
            for dj_cls, ogr_cls in list(ogr_mapping.items()):
                if issubclass(type(field), dj_cls):
                    ogr_type = ogr_cls
                    break
            else:
                raise KeyError("OGR type not mapped. Update |ogr_mapping| in |map_ogr_types| method.")

        # Create the field definition.
        field_defn = ogr.FieldDefn(str(shpname),ogr_type)

        # Special operations for OGR field types.
        if ogr_type == ogr.OFTReal: field_defn.SetPrecision(precision)
        if ogr_type == ogr.OFTString: field_defn.SetWidth(width)

        return field_defn

    def addDbf(self, dbfStream):
        self.dbf_streams.append(dbfStream)