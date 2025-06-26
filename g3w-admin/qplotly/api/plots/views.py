# coding=utf-8
"""" Qplotly api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-17'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qgis.core import \
    QgsRectangle, \
    QgsReferencedRectangle, \
    QgsCoordinateReferenceSystem
from rest_framework.response import Response
from core.api.base.views import G3WAPIView
from core.utils.qgisapi import get_qgis_layer, get_qgs_project
from qdjango.models import Layer
from qplotly.models import QplotlyWidget
from qplotly.utils.qplotly_settings import QplotlySettings
from qplotly.utils.qplotly_factory import QplotlyFactoring, QplotlyFactoringRelation
import plotly
import plotly.graph_objects as go


import logging

logger = logging.getLogger('module_qplotly')


WITH_RELATIONS_PARAM = 'withrelations'


class QplotlyTraceAPIView(G3WAPIView):
    """API return plotly trace data"""

    def _get_trace(self, factory):
        """
        Private method to get trace data by plotly version
        :param factory: QplotlyFactoring or QplotlyFactoringRelation instance
        :return: Trace data as dict
        :return type: dict
        """

        if plotly.__version__ != '2.5.1':
            fig = go.Figure(layout=factory.layout)
            fig.add_trace(factory.trace[0])
            data = fig.to_dict()['data']
        else:
            data = factory.trace

        return data

    def _get_relations(self, with_relations=[], flayer=None, ffactory=None, request=None, res={}):
        """
        Check for relations adn add to res
        :param with_relations: relations id list
        :param source_layer: QgsVectorLayer instance of father
        :param res: result dict to send into response
        """

        qgs_prj = get_qgs_project(flayer.project.qgis_file.path)

        relations = None
        for relation_id in with_relations:
            qgs_relation = qgs_prj.relationManager().relation(relation_id)
            if not qgs_relation.isValid():
                logger.error(f'Relation with id {relation_id} is not valid.')
                continue

            csource_layer = qgs_relation.referencingLayer()
            clayer = flayer.project.layer_set.get(qgs_layer_id=csource_layer.id())

            # get every qplotly active for child layer
            qplotlies = clayer.qplotlywidget_set.all()
            if len(qplotlies) == 0:
                continue

            if not relations:
                relations = {
                    relation_id: []
                }
            else:
                relations.update({
                    relation_id: []
                })

            for qplotly in qplotlies:
                settings = QplotlySettings()
                if not settings.read_from_model(qplotly):
                    logger.error(f'Error on load qlotly settings for layer pk {clayer.pk}.')
                    continue

                factory = QplotlyFactoringRelation(settings, request=request, layer=clayer)
                factory.source_layer = csource_layer

                # create expression
                ffiltered_features = ffactory.source_layer.getFeatures(ffactory.qgsrequest)
                factory.set_father_features_expresion(qgs_relation=qgs_relation,
                                                      ffiltered_features=ffiltered_features)

                factory.rebuild()

                relations[relation_id].append({
                    'id': qplotly.pk,
                    'data': self._get_trace(factory)
                })

            if 'relations' not in res and relations:
                res.update({'relations': relations})

    def get(self, request, **kwargs):

        qplotly = QplotlyWidget.objects.get(pk=kwargs['pk'])

        # load settings from db
        settings = QplotlySettings()
        if not settings.read_from_model(qplotly):
            raise Exception()

        # patch for xml setting linked to layer with same datasource.
        qgs_layer_id = kwargs['qgs_layer_id'] if 'qgs_layer_id' in kwargs else settings.source_layer_id

        # get bbox if is sent
        # 2021/01/12 using IntersectBBOXFilter
        rect = None
        #if 'bbox' in kwargs:
        #    rect = QgsReferencedRectangle(QgsRectangle(**kwargs['bbox']),
        #                                  QgsCoordinateReferenceSystem(qplotly.project.group.srid.srid))

        # instance a QplotlyFactory
        layer = Layer.objects.get(qgs_layer_id=qgs_layer_id, project_id=kwargs['project_id'])
        factory = QplotlyFactoring(settings, visible_region=rect, request=request, layer=layer)


        # is possible get the first layer
        factory.source_layer = get_qgis_layer(qplotly.layers.get(qgs_layer_id=settings.source_layer_id,
                                                                    project_id=kwargs['project_id']))
        factory.rebuild()

        res = {
            'data': self._get_trace(factory)
        }

        # if withrelations was sent add relations trace values
        # ----------------------------------------------------
        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params

        with_relations = request_data.get(WITH_RELATIONS_PARAM)
        if with_relations:
            self._get_relations(
                with_relations=with_relations.split(','),
                flayer=layer,
                ffactory=factory,
                request=request,
                res=res,
            )

        self.results.results.update(res)

        return Response(self.results.results)



class QplotlyTraceConfigAPIView(G3WAPIView):
    """API return plotly trace config data
    .. note:: This is used to get the trace config data for a plotly widget.
    """

    def get(self, request, **kwargs):
        """Get the trace config data for a plotly widget."""
        qplotly = QplotlyWidget.objects.get(pk=kwargs['pk'])

        # load settings from db
        settings = QplotlySettings()
        if not settings.read_from_model(qplotly):
            raise Exception()

        # instance a QplotlyFactory
        factory = QplotlyFactoring(settings, request=request, layer=None)
        #factory.build_layout()

        fig = go.Figure(layout=factory.layout)
        layout = fig.to_dict()['layout']

        res = {
            'data':{
                'type': settings.plot_type,
                'layout': layout,
                'config': {
                    'displaylogo': False,
                    'displayModeBar': True,
                    'modeBarButtonsToRemove': ['sendDataToCloud', 'editInChartStudio'],
                    'editable': True,
                    'responsive': True,
                    'scrollZoom': False,
                    'toImageButtonOptions': {'filename': 'Plot - ' + layout.get('title', {}).get('text', f"[{qplotly.pk}]") },
                    'autosize': True,
                }
            }   
        }

        self.results.results.update(res)

        return Response(self.results.results)