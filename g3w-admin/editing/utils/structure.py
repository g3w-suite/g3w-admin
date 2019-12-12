from osgeo import ogr

#EDITING_POST_DATA_ADDED = 'add'
#EDITING_POST_DATA_UPDATED = 'update'
#EDITING_POST_DATA_DELETED = 'delete'


MAPPING_OGR_GEOTYPES_WKT = {
    ogr.wkbPoint: 'Point',
    ogr.wkbMultiPoint: 'MultiPoint',

}



