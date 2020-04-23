from django.db import models
from django.contrib.gis.db.models import Model
from django.db import connections
from django.contrib.gis.db.models import GeometryField
from django.apps import apps as g3wsuite_apps
from qdjango.utils.structure import datasource2dict, get_schema_table
from model_utils import Choices
from sqlalchemy import create_engine, MetaData
from sqlalchemy.engine.url import URL
from geoalchemy2 import Table as GEOTable
import geoalchemy2.types as geotypes
from sqlalchemy.dialects.postgresql import base as PGD
from sqlalchemy.dialects.sqlite import base as SLD
from osgeo import ogr
from core.utils.db import build_django_connection, build_dango_connection_name
from core.utils.geo import camel_geometry_type
from .structure import MAPPING_GEOALCHEMY_DJANGO_FIELDS, MAPPING_OGRWKBGTYPE, BooleanField, NullBooleanField

ogr.UseExceptions()

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
        for key, value in options.items():
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



def get_creator_from_qdjango_layer(layer, app_label='core'):
    """
    Returns the creator instance for a layer
    """

    CREATOR_CLASSES = {
        'postgres': PostgisCreateGeomodel,
        'spatialite': SpatialiteCreateGeomodel
    }

    datasource = datasource2dict(layer.datasource)

    if layer.layer_type not in list(CREATOR_CLASSES.keys()):
        raise Exception('Layer type is {} - it must be one of {}'.format(layer.layer_type, ' or '.join(list(CREATOR_CLASSES.keys()))))

    creator = CREATOR_CLASSES[layer.layer_type](layer, datasource, app_label)

    return creator


def create_geomodel_from_qdjango_layer(layer, app_label='core'):
    """
    Create dynamic django geo model
    """

    creator = get_creator_from_qdjango_layer(layer, app_label)
    return creator.geo_model, creator.using, creator.geometry_type


class G3WChoices(Choices):

    def __setitem__(self, key, value):
        self._store((key, key, value), self._triples, self._doubles)



class CreateGeomodel(object):
    """Build a model at runtime
    """

    def __init__(self, layer, datasource, app_label='core'):
        """Create a model from a layer and a datasource
        """

        self.app_label = app_label
        self.layer = layer
        self.datasource = datasource
        self.django_model_fields = dict()

        self.get_data_from_ds()
        self.get_geometry_type()
        self.get_fields()
        self.build_connection()
        self.create_model()

    def get_geometry_type(self):
        self.geometry_type = None

    def get_data_from_ds(self):

        self.schema, self.table = get_schema_table(self.datasource['table'])
        self.model_table_name = '{}.{}_{}'.format(self.schema, self.table, self.layer.project.pk)

        if self.model_table_name in g3wsuite_apps.all_models[self.app_label]:
            del (g3wsuite_apps.all_models[self.app_label][self.model_table_name])

    def get_fields(self):

        # instance Geoalchemy
        return self.create_geotable()

        # add for specific layer type
        # ....

    def create_engine(self):
        pass

    def create_geotable(self):

        engine, geotable_kwargs = self.create_engine()

        meta = MetaData(bind=engine)
        return GEOTable(
                    self.table, meta, autoload=True, autoload_with=engine, **geotable_kwargs
                )

    def build_connection(self):
        pass

    def create_model(self):

        self.geo_model = create_model(self.model_table_name, self.django_model_fields, app_label=self.app_label,
                                 module='{}.models'.format(self.app_label), db=self.using,
                                 options={'db_table': self.table})


class PostgisCreateGeomodel(CreateGeomodel):
    """
    PostgreSql model Dj creator.
    """
    layer_type = 'postgis'

    def get_geometry_type(self):
        self.geometry_type = self.datasource.get('type', None)

    def create_engine(self):
        engine = create_engine(URL(
            'postgresql',
            self.datasource['user'],
            self.datasource['password'],
            self.datasource['host'],
            self.datasource['port'],
            self.datasource['dbname']
        ), echo=False)

        geotable_kwargs = {
            'schema': self.schema
        }

        return engine, geotable_kwargs

    def get_fields(self):

        geotable = super(PostgisCreateGeomodel, self).get_fields()

        for column in geotable.columns:

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
                if srid == -1 and srid != self.layer.srid:
                    srid = self.layer.srid
                kwargs['srid'] = srid

                # if geometry_type is not set get from here:
                if not self.geometry_type:
                    self.geometry_type = camel_geometry_type(column.type.geometry_type)

            if type(column.type) in (PGD.VARCHAR, PGD.CHAR):
                if column.type.length:
                    kwargs['max_length'] = column.type.length
                else:
                    kwargs['max_length'] = 255
            elif type(column.type) == PGD.NUMERIC:
                kwargs['max_digits'] = column.type.precision if column.type.precision else 16
                if column.type.scale:
                    kwargs['decimal_places'] = column.type.scale
                else:
                    if column.type.precision:
                        kwargs['decimal_places'] = 65535 - kwargs['max_digits']
                    else:
                        kwargs['decimal_places'] = 6

            self.django_model_fields[column.name] = dj_model_field_type(**kwargs)

    def build_connection(self):

        self.using = build_dango_connection_name(self.layer.datasource)

        if self.using not in connections.databases:
            connections.databases[self.using] = build_django_connection(self.datasource, schema=self.schema)


class SpatialiteCreateGeomodel(CreateGeomodel):

    layer_type = 'spatialite'

    def create_engine(self):

        # try with ogr

        splite = ogr.Open(self.datasource['dbname'])
        daLayer = splite.GetLayerByName(str(self.table))

        # get geometry columns e type
        self.geometry_column = daLayer.GetGeometryColumn() if daLayer.GetGeometryColumn() else None
        if self.geometry_column:
            self.geometry_srid = int(daLayer.GetSpatialRef().GetAuthorityCode(None))

            # get geometry type
            self.geometry_type = MAPPING_OGRWKBGTYPE[daLayer.GetGeomType()]

        engine = create_engine('sqlite:///{}'.format(
            self.datasource['dbname']
        ), echo=False)

        geotable_kwargs = {}

        # check if table as autoincrement column
        # from https://stopbyte.com/t/how-to-check-if-a-column-is-autoincrement-primary-key-or-not-in-sqlite/174/2
        q = 'SELECT "is-autoincrement" FROM sqlite_master WHERE tbl_name="{}" AND sql LIKE "%AUTOINCREMENT%"'\
            .format(self.table)

        self.autoincrement = True if len(engine.execute(q).fetchall()) > 0 else False

        return engine, geotable_kwargs

    def get_fields(self):

        geotable = super(SpatialiteCreateGeomodel, self).get_fields()

        for column in geotable.columns:

            kwargs = {}

            if column.primary_key:
                kwargs['primary_key'] = True

                # check fo autoincremente
                if self.autoincrement:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS['autoincrement']
                else:
                    dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS[type(column.type)]

            elif column.name == self.geometry_column:
                kwargs['srid'] = self.geometry_srid
                dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS['geotype']

            else:
                dj_model_field_type = MAPPING_GEOALCHEMY_DJANGO_FIELDS[type(column.type)]

            if column.unique:
                kwargs['unique'] = True

            if column.nullable:
                kwargs['null'] = True
                kwargs['blank'] = True
            else:
                kwargs['blank'] = False

            if type(column.type) == SLD.VARCHAR:
                if column.type.length:
                    kwargs['max_length'] = column.type.length
                else:
                    kwargs['max_length'] = 255

            if type(column.type) == SLD.NUMERIC and column.name != self.geometry_column:
                kwargs['max_digits'] = column.type.precision if column.type.precision else 65535
                kwargs['decimal_places'] = column.type.scale if column.type.scale else \
                    column.type._default_decimal_return_scale

            self.django_model_fields[column.name] = dj_model_field_type(**kwargs)

    def build_connection(self):
        self.using = build_dango_connection_name(self.datasource['dbname'])

        if self.using not in connections.databases:
            connections.databases[self.using] = build_django_connection(self.datasource, layer_type=self.layer_type)
