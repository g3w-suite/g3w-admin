from pyproj import Proj, transform

def TransformBBox(epsgFrom, epsgTo, BBox):

    prjFrom = Proj(init="epsg:".format(epsgFrom))
    prjTo = Proj(init="epsg:".format(epsgTo))

    # Todo: implement bbox split and transform