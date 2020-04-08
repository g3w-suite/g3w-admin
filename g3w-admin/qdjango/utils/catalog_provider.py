# coding=utf-8
""""Provider for catalog records

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-01-15'
__copyright__ = 'Copyright 2019, Gis3W'


from qdjango.api.serializers import ProjectSerializer, LayerSerializer
from qdjango.models import Layer, Project
from django.conf import settings
from guardian.shortcuts import assign_perm, get_objects_for_user
from django.contrib.auth.models import AnonymousUser
from django.urls import reverse

import copy
import logging
logger = logging.getLogger('catalog')


def catalog_provider(groups=[]):
    """Record factory function: builds a list of dictionaries
    with all information for the catalog entries (datasets)
    provided by this class.

    This functions is called by the catalog module to
    build or synchronize the catalog entries.

    Only layers that are publicly visible will be returned.
    Raster layers are returned as WMS entries, vector layers
    will return a single entry with two separate links:
    one for WMS and one for WFS.

    The list can be optionally filtered by Group.

    :param groups: group filters, defaults to []
    :param groups: list of Group instance, optional
    :return: catalog entries
    :rtype: list of dictionaries
    """

    def _is_raster(layer):
        return layer.layer_type in ('gdal', 'raster')

    def _get_url(qdjango_project):
        ows_url = reverse('OWS:ows', kwargs={'group_slug': qdjango_project.group.slug, 'project_type': 'qdjango', 'project_id': qdjango_project.id})
        return "{0.QDJANGO_SERVER_URL}/{1}".format(settings, ows_url)

    results = []

    projects = get_objects_for_user(AnonymousUser(), 'view_project', Project)

    layer_filters = {}

    if groups:
        projects = projects.filter(group__in=groups)

    for project in projects:
        project_data = ProjectSerializer(project).to_representation(project)
        layer_filters['project'] = project
        visible_layers = get_objects_for_user(AnonymousUser(), 'view_layer', Layer).filter(
            **layer_filters).values_list('qgs_layer_id', flat=True)
        for layer_data in [l for l in project_data['layers'] if l['id'] in visible_layers]:
            layer_metadata = project_data['metadata']
            layer_metadata.update(layer_data)
            layer = Layer.objects.get(qgs_layer_id=layer_data['id'], project=project)
            # Full list of Record fields
            rec = {
                # Maps to pycsw:Identifier
                'identifier': 'wms.qdjango.%s.%s' % (layer.slug, layer.id),
                # From caller 'catalog': layer_metadata['catalog'],  # Maps to pycsw:ParentIdentifier
                'typename': layer.name,  # Maps to pycsw:Typename
                #'schema': layer_metadata['schema'],  # Maps to pycsw:Schema
                #'metadata_source': layer_metadata['metadata_source'],  # maps to pycsw:MdSource
                #'insert_date': layer_metadata['insert_date'],  # Maps to pycsw:InsertDate
                #'xml': layer_metadata['xml'],  #  Maps to pycsw:XML
                #'any_text': layer_metadata['any_text'],  # Maps to pycsw:AnyText
                #'language': layer_metadata['language'],  # Maps to pycsw:Language
                'title': layer_metadata['title'],  # Maps to pycsw:Title
                # Maps to pycsw:Abstract
                'abstract': layer_metadata['abstract'],
                # Maps to pycsw:Keywords: cannot because they are not GEMET! (comma separated GEMET)
                # 'keywords': ','.join(layer_metadata['keywords']),
                #'keywords_types': layer_metadata['keywords_types'],  # Maps to pycsw:Keywordstype
                'format': 'image/jpeg,image/png',  # Maps to pycsw:Format
                # Maps to pycsw:Source
                # 'source': layer_metadata['source'],
                #'date': layer_metadata['date'],  # Maps to pycsw:Date, pycsw:Modified, pycsw:RevisionData, pycsw:CreationDate and pycsw:PublicationDate
                'type': 'dataset',  # Maps to pycsw:Type
                # Maps to pycsw:BoundingBox
                'bounding_box': 'MULTIPOINT({1} {0}, {3} {2})'.format(*list(layer_metadata['bbox'].values())),
                'crs': layer_metadata['crs'],  # Maps to pycsw:CRS
                #'alternate_title': layer_metadata['alternate_title'],  # Maps to pycsw:AlternateTitle
                # From caller 'organization_name': layer_metadata['organization_name'],  # Maps to pycsw:OrganizationName
                # From caller 'security_constraints': layer_metadata['security_constraints'],  # Maps to pycsw:SecurityConstraints
                #'topic_category': layer_metadata['topic_category'],  # Maps to pycsw:TopicCategory
                #'resource_language': layer_metadata['resource_language'],  # Maps to pycsw:ResourceLanguage
                #'geographic_description_code': layer_metadata['geographic_description_code'],  # Maps to pycsw:GeographicDescriptionCode
                #'denominator': layer_metadata['denominator'],  # Maps to pycsw:Denominator
                #'distance_value': layer_metadata['distance_value'],  # Maps to pycsw:DistanceValue
                #'distance_uom': layer_metadata['distance_uom'],  # Maps to pycsw:DistanceUOM
                #'temporal_extent_begin': layer_metadata['temporal_extent_begin'],  # Maps to pycsw:TempExtent_begin
                #'temporal_extent_end': layer_metadata['temporal_extent_end'],  # Maps to pycsw:TempExtent_end
                'service_type': 'WMS',  # Maps to pycsw:ServiceType
                'service_type_version': '1.3.0',  # Maps to pycsw:ServiceTypeVersion
                #'operation': layer_metadata['operation'],  # Maps to pycsw:Operation
                #'coupling_type': layer_metadata['coupling_type'],  # Maps to pycsw:CouplingType
                #'operates_on': layer_metadata['operates_on'],  # Maps to pycsw:OperatesOn
                #'operates_on_identifier': layer_metadata['operates_on_identifier'],  # Maps to pycsw:OperatesOnIdentifier
                #'operates_on_name': layer_metadata['operates_on_name'],  # Maps to pycsw:OperatesOnName
                #'degree': layer_metadata['degree'],  # Maps to pycsw:Degree
                # Maps to pycsw:AccessConstraints
                'access_constraints': layer_metadata['accessconstraints'],
                #'other_constraints': layer_metadata['other_constraints'],  # Maps to pycsw:OtherConstraints
                #'classification': layer_metadata['classification'],  # Maps to pycsw:Classification
                #'condition_applying_to_access_and_use': layer_metadata['condition_applying_to_access_and_use'],  # Maps to pycsw:ConditionApplyingToAccessAndUse
                #'lineage': layer_metadata['lineage'],  # Maps to pycsw:Lineage
                #'responsible_party_role': layer_metadata['responsible_party_role'],  # Maps to pycsw:ResponsiblePartyRole
                #'specification_title': layer_metadata['specification_title'],  # Maps to pycsw:SpecificationTitle
                #'specification_date': layer_metadata['specification_date'],  # Maps to pycsw:SpecificationDate
                #'specification_date_type': layer_metadata['specification_date_type'],  # Maps to pycsw:SpecificationDateType
                #'creator': layer_metadata['creator'],  # Maps to pycsw:Creator
                #'publisher': layer_metadata['publisher'],  # Maps to pycsw:Publisher
                #'contributor': layer_metadata['contributor'],  # Maps to pycsw:Contributor
                #'relation': layer_metadata['relation'],  # Maps to pycsw:Relation
                'links': "WMS,WMS Server,OGC:WMS,%s" % _get_url(layer.project.qgis_file), # Maps to pycsw:Links - format: name,description,protocol,url
            }

            if not _is_raster(layer):
                rec['links'] += "^WFS,WFS Server,OGC:WFS,%s" % _get_url(layer.project.qgis_file)
                rec['service_type'] += ',WFS'
                rec['format'] += ',application/xml'
                rec['service_type_version'] += ',1.1.0'
                rec['identifier'] = 'ows.qdjango.%s.%s' % (layer.slug, layer.id)

            results.append(rec)

    return results
