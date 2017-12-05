from django.db import models
from django.contrib.gis.db.models import Model
from django.db import connections
from django.contrib.gis.db.models import GeometryField
from django.apps import apps as g3wsuite_apps
from qdjango.utils.structure import datasource2dict, get_schema_table
from model_utils import Choices
from sqlalchemy import create_engine, MetaData
from geoalchemy2 import Table as GEOTable
import geoalchemy2.types as geotypes
from sqlalchemy.dialects.postgresql import base as PGD
from osgeo import ogr
from core.utils.db import build_django_connection, build_dango_connection_name
from core.utils.geo import camel_geometry_type
from .structure import MAPPING_GEOALCHEMY_DJANGO_FIELDS, BooleanField, NullBooleanField



def get_geometry_column(geomodel):
    """
    From GeoDjango model instance return GeometryField instance,
    check if model has only one geometry column
    :param geomodel: Geodjango model instance
    :return: Geodjango GeometryField instance
    """
    geo_fields = list()
    fields = geomodel._meta.get_fields()

    for f in fields:
        if isinstance(f, GeometryField):
            geo_fields.append(f)

    # check hao many columns are geomentry colummns:
    if len(geo_fields) > 1:
        raise Exception('Model has more then one geometry column {}'.format(', '.join([f.name for f in geo_fields])))

    return geo_fields[0]


def create_model(name, fields=None, app_label='', module='', db='default', options=None, admin_opts=None):
    """
    Create specified model
    """

    class Meta:
        # Using type('Meta', ...) gives a dictproxy error during model creation
        pass

    if app_label:
        # app_label must be set using the Meta inner class
        setattr(Meta, 'app_label', app_label)

    # Update Meta with any options that were provided
    if options is not None:
        for key, value in options.iteritems():
            setattr(Meta, key, value)

    # Set up a dictionary to simulate declarations within a class
    attrs = {'__module__': module, 'Meta': Meta}

    # Add in any fields that were provided
    if fields:
        attrs.update(fields)

    # add model manager default
    if db != 'default':
        attrs['objects'] = models.Manager()
        attrs['objects']._db = db

    # Create the class, which automatically triggers ModelBase processing
    model = type(name, (Model,), attrs)

    return model


def create_geomodel_from_qdjango_layer(layer, app_label='core'):
    """
    Create dynamic django geo model
    """
    datasource = datasource2dict(layer.datasource)

    if layer.layer_type not in ('postgres', 'spatialite'):
        raise Exception('Layer type, {},must be one of \'postgresql\' or \'spatialite\''.format(layer.layer_type))
    layer_type = 'postgis' if layer.layer_type == 'postgres' else 'spatialite'

    schema, table = get_schema_table(datasource['table'])

    model_table_name = '{}.{}_{}'.format(schema, table, layer.project.pk)

    if layer.layer_type == 'postgres':
        datasource = datasource2dict(layer.datasource)
        geometrytype = datasource.get('type', None)
    else:
        geometrytype = layer.geometrytype

    if model_table_name not in g3wsuite_apps.all_models[app_label]:
        to_create_model = True
    else:
        to_create_model = False
        geo_model = g3wsuite_apps.all_models[app_label][model_table_name]

    if to_create_model:
        if layer_type == 'postgis':

            engine = create_engine('postgresql://{}:{}@{}:{}/{}'.format(
                datasource['user'],
                datasource['password'],
                datasource['host'],
                datasource['port'],
                datasource['dbname']
            ), echo=False)

            geotable_kwargs = {
                'schema': schema
            }
        else:

            # try with ogr
            splite = ogr.Open(datasource['dbname'])
            daLayer = splite.GetLayerByName(str(table))

            # get geometry columns e type
            geometry_column = daLayer.GetGeometryColumn() if daLayer.GetGeometryColumn() else None
            if geometry_column:
                geometry_srid = int(daLayer.GetSpatialRef().GetAuthorityCode(None))

            engine = create_engine('sqlite:///{}'.format(
                datasource['dbname']
            ), echo=False)

            geotable_kwargs = {}

        meta = MetaData(bind=engine)
        geotable = GEOTable(
            table, meta, autoload=True, autoload_with=engine, **geotable_kwargs
        )

        django_model_fields = {}
        for column in geotable.columns:

            if layer_type == 'postgis':
                if column.autoincrement:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS['autoincrement']
                else:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS[type(column.type)]
                kwargs = {}
                if column.primary_key:
                    kwargs['primary_key'] = True
                if column.unique:
                    kwargs['unique'] = True
                if column.nullable:
                    kwargs['null'] = True
                    kwargs['blank'] = True

                    # special case for BoolenaField
                    if dj_model_field_type == BooleanField:
                        dj_model_field_type = NullBooleanField

                else:
                    kwargs['blank'] = False
                    kwargs['null'] = False
                if type(column.type) == geotypes.Geometry:
                    srid = column.type.srid
                    if srid == -1 and srid != layer.srid:
                        srid = layer.srid
                    kwargs['srid'] = srid

                    # if geometrytype is not set get from here:
                    if not geometrytype:
                        geometrytype = camel_geometry_type(column.type.geometry_type)
                if type(column.type) == PGD.VARCHAR:
                    if column.type.length:
                        kwargs['max_length'] = column.type.length
                    else:
                        kwargs['max_length'] = 255
                elif type(column.type) == PGD.NUMERIC:
                    kwargs['max_digits'] = column.type.precision if column.type.precision else 65535
                    kwargs['decimal_places'] = column.type.scale if column.type.scale else 65535

                django_model_fields[column.name] = dj_model_field_type(**kwargs)
            else:

                kwargs = {}

                if column.primary_key:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS['autoincrement']
                    kwargs['primary_key'] = True
                else:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS[type(column.type)]
                if column.unique:
                    kwargs['unique'] = True
                if column.nullable:
                    kwargs['null'] = True
                    kwargs['blank'] = True
                else:
                    kwargs['blank'] = False
                if column.name == geometry_column:
                    kwargs['srid'] = geometry_srid
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS['geotype']
                else:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS[type(column.type)]
                django_model_fields[column.name] = dj_model_field_type(**kwargs)

    if layer_type == 'spatialite':
        using = build_dango_connection_name(datasource['dbname'])
    else:
        using = build_dango_connection_name(layer.datasource)

    if using not in connections.databases:

        if layer_type == 'postgis':
            connections.databases[using] = build_django_connection(datasource, schema=schema)
        else:
            connections.databases[using] = build_django_connection(datasource, layer_type='spatialite')

    if to_create_model:
        geo_model = create_model(model_table_name, django_model_fields, app_label=app_label,
                                 module='{}.models'.format(app_label), db=using,
                                 options={'db_table': table})

    return geo_model, using, geometrytype


class G3WChoices(Choices):

    def __setitem__(self, key, value):
        self._store((key, key, value), self._triples, self._doubles)