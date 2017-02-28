from django.conf import settings
from django.http.response import HttpResponse
from qdjango.utils.structure import datasource2dict, get_schema_table
from qdjango.utils.data import makeDatasource
from qdjango.models import Layer as QdjangoLayer
from py3o.template import Template
import ogr, json, hashlib, time, os


class GDALOGRLayer(object):

    def __init__(self, layer):

        self._layer = layer

        self._ogr_layer = None
        self._datasource = self.get_gdalogr_datasource()
        self.instance_gdalogr_layer()

    def get_gdalogr_datasource(self):

        self.layer_type = self._layer.layer.layer_type

        if self.layer_type in (QdjangoLayer.TYPES.ogr, QdjangoLayer.TYPES.gdal):
            return self._layer.layer.datasource, 0
        elif self.layer_type in (QdjangoLayer.TYPES.postgres, QdjangoLayer.TYPES.spatialite):
            dts = datasource2dict(self._layer.layer.datasource)

            if self.layer_type == QdjangoLayer.TYPES.postgres:
                schema, table = get_schema_table(dts['table'])
                return "PG: host={} dbname={} user={} password={} port={}".format(
                    dts['host'],
                    dts['dbname'],
                    dts['user'],
                    dts['password'],
                    dts['port']
                ), '{}.{}'.format(schema, table)
            else:
                pass

    def instance_gdalogr_layer(self):

        self._ogr_connection = ogr.Open(self._datasource[0], 0)
        self._ogr_layer = self._ogr_connection.GetLayer(self._datasource[1])

    def get_ogr_layer(self):
        return self._ogr_layer

    def get_cdu_layer(self):
        return self._layer

    def __iter__(self):
        return self._ogr_layer

    def reset(self):
        self._ogr_layer.ResetReading()

    def destroy(self):
        self._ogr_layer.Destroy()


class CDU(object):

    def __init__(self, config=None):

        self.config = config
        self._particelle = None

        # add catasto layer
        self._cdu_layer_catasto = self.config.layer_catasto()
        self._field_foglio, self._field_numero = self._get_fields_foglio_numero();
        self._layer_catasto = GDALOGRLayer(self._cdu_layer_catasto)

        # add against layers
        self._against_layers = list()
        for against_layer in self.config.layers_against():
            self.add_against_layer(against_layer)

        # initialize results:
        self.results = dict()

    def _get_fields_foglio_numero(self):
        """
        Get and return field name foglio and numero of cadastre layer
        :return: tuple
        """
        return self._cdu_layer_catasto.getFieldFoglio(), self._cdu_layer_catasto.getFieldParticella()

    def _get_foglio_numero_from_feature(self, feature_particella):
        """
        Return foglio and numero value from feature
        :param feature_particella:
        :return: tuple
        """
        return getattr(feature_particella, self._field_foglio), getattr(feature_particella, self._field_numero)

    def _make_key_results(self, feature_particella):
        """
        Create unique key results
        :param feature_particella:
        :return:
        """
        return "F{}N{}".format(*self._get_foglio_numero_from_feature(feature_particella))

    def add_against_layer(self, against_layer=None):
        """
        Add againts layer to CDU object
        :param against_layer:
        :return:
        """
        if against_layer:
            self._against_layers.append(GDALOGRLayer(against_layer))

    def add_particelle(self, particelle=None):
        """
        Add particella submit by client
        :param particelle:
        :return:
        """
        if particelle:
            self._particelle = particelle

            # create ogr vector  laeyr for particelle
            self._ogr_layer_particelle_source = ogr.Open(json.dumps(self._particelle))
            self._ogr_layer_particelle = self._ogr_layer_particelle_source.GetLayer()

    def calculate(self):
        """
        Make intersection of particelle in against layer features adn put results in results property
        :return:
        """

        def build_field_res_dict(field, feature, layer):

            # get field value
            value = feature.GetFID() if field['name'] == layer.GetFIDColumn() else getattr(feature, field['name'])

            return {
                'name': field['name'],
                'alias': field['alias'],
                'value': value
            }

        # make intersects on againsta layer for every feature in particelle
        # for id results
        id_result = 0
        for feature_particella in self._ogr_layer_particelle:

            # get geometry from feature_particella
            geometry_particella = feature_particella.GetGeometryRef()

            #get uniquer results key
            key_particella = self._make_key_results(feature_particella)

            # add data to results cdu calculation
            if not self.results.get(key_particella):
                self.results[key_particella] = dict(zip(
                    [self._field_foglio, self._field_numero],
                    self._get_foglio_numero_from_feature(feature_particella)
                ))

                # add area:
                self.results[key_particella]['area'] = geometry_particella.GetArea()

            # add cadastre plus fields results
            plus_fields_catasto = self._cdu_layer_catasto.getPlusFieldsCatasto()
            res_plus_field_catasto = list()
            for field in plus_fields_catasto:
                res_plus_field_catasto.append(build_field_res_dict(field, feature_particella,
                                                                  self._layer_catasto.get_ogr_layer()))

            self.results[key_particella]['fields'] = res_plus_field_catasto

            # reset results_against
            results_against = list()

            # for every against_layer for every feature in against_layer
            for against_layer in self._against_layers:

                # get cdu_layer
                cdu_against_layer = against_layer.get_cdu_layer()
                cdu_against_layer_fields = cdu_against_layer.getLayerFieldsData()

                against_layer.reset()
                for feature_against in against_layer:

                    # get geeomtry for check
                    geometry_against = feature_against.GetGeometryRef()

                    # check intersections
                    if geometry_against and geometry_against.Intersects(geometry_particella):

                        # get intersection geomentry and area data:
                        geometry_against_intersection = geometry_against.Intersection(geometry_particella)
                        geometry_against_intersection_area = geometry_against_intersection.GetArea()
                        geometry_against_intersection_area_perc = geometry_against_intersection_area / \
                                                                   geometry_particella.GetArea() * 100 \
                            if geometry_against_intersection_area else None

                        # make sub results dict
                        res = {
                            'id': id_result,
                            'layer_id': cdu_against_layer.layer.qgs_layer_id,
                            'name': cdu_against_layer.layer.name,
                            'alias': cdu_against_layer.alias,
                            'geometry': json.loads(geometry_against_intersection.ExportToJson()),
                            'area': round(geometry_against_intersection_area, 2)
                            if geometry_against_intersection_area else None,
                            'perc': round(geometry_against_intersection_area_perc, 2)
                            if geometry_against_intersection_area_perc else None,
                            'fields': list()
                        }

                        # add fields data
                        for field in cdu_against_layer_fields:
                            res['fields'].append(build_field_res_dict(field, feature_against,
                                                                      against_layer.get_ogr_layer()))

                        results_against.append(res)

                        # ne id_result
                        id_result += 1

            self.results[key_particella]['results'] = results_against

    def _get_session_key(self):
        """
        Create ande return key session to store and retrive results data.
        :return:
        """
        return "CDU_".format(self.config.pk)

    def save_in_session(self, request):
        """
        Get results and punt into request sessions
        :param request:
        :return:
        """
        request.session[self._get_session_key()] = self.results

    def get_from_session(self, request):
        """
        Retrive results data from session
        :param request:
        :return:
        """
        return request.session[self._get_session_key()]

    def destroy(self):
        """
        Destroy ogr object
        :return:
        """
        self._layer_catasto.destroy()
        for against_layer in self._against_layers:
            against_layer.destroy()

        self._ogr_layer_particelle.Destroy()


class ODTTplItem(object):
    """
    py3o template object
    """
    def __init__(self, data=None):

        if data:
            for k, v in data.items():
                if k not in ('geometry',):
                    if isinstance(v, dict):
                        setattr(self, k, ODTTplItem(v))
                    elif isinstance(v, list):
                        litem = list()
                        for i in v:
                            litem.append(ODTTplItem(i))
                        setattr(self, k, litem)
                    else:
                        setattr(self, k, v)


class ODT(object):
    """
    Wrapper fro py0.template object
    """

    out_filename = "cdu_{}.odt"

    def __init__(self, config=None, results=None):

        self.config = config
        self.results = results

        self._create_odt_outfile()
        self.o_template = self._init_o_template()

    def _init_o_template(self):

        return Template(self.config.odtfile.path, self.out_file)

    def _create_odt_outfile(self):

        self.out_filename_built = self.out_filename.format(time.time())
        self.out_file = settings.MEDIA_ROOT + self.out_filename_built

    def write_document(self):
        """
        Create Tpl object item and write it into o_template
        :return:
        """

        tpl_res_items = list()
        for keyres, res in self.results.items():
            tpl_res_items.append(ODTTplItem(res))

        self.o_template.render({'items': tpl_res_items, 'lawItems': []})

    def response(self):

        f = open(self.out_file)
        response = HttpResponse(f.read(), content_type="application/vnd.oasis.opendocument.text")
        f.close()
        os.remove(self.out_file)
        response['Content-Disposition'] = 'attachment; filename="{}"'.format(self.out_filename_built)

        return response