import re
from ModestMaps.Core import Point, Coordinate
from TileStache.Geography import SphericalMercator, WGS84

class CustomGridProjection():
    def __init__(self, xyz, srs):
        self.xyz = xyz
        self.srs = self.normalizeSrs(srs)
        self.tilesize = 256
        self.resolutions = [2**(x+1) for x in list(reversed(range(15)))] + [1.0/2**x for x in range(10)]

        self.standardProjections = {
            'EPSG:3857': SphericalMercator(),
            'EPSG:900913': SphericalMercator(),
            'EPSG:4326': WGS84(),
            'EPSG:4269': WGS84()
        }

        standardProjection = self.standardProjections.get(self.srs, None)
        self.coordinateProj = standardProjection.coordinateProj if standardProjection else self._coordinateProj

    def _coordinateProj(self, coord):
        tile_meters = self.tilesize * self.resolutions[coord.zoom]
        row = (2**coord.zoom - coord.row) if self.xyz else coord.row
        px = coord.column * tile_meters
        py = row * tile_meters
        return Point(px,py)

    def normalizeSrs(self,srs):
        if isinstance(srs, (int, float)):
            return 'EPSG:' + srs
        codes = re.findall(r'\d+', srs)
        if len(codes) > 0:
            return 'EPSG:{}'.format(codes[0])
        return None


class CustomXYZGridProjection(CustomGridProjection):
    def __init__(self, srs):
        CustomGridProjection.__init__(self, True, srs)

class CustomTMSGridProjection(CustomGridProjection):
    def __init__(self, srs):
        CustomGridProjection.__init__(self, False, srs)