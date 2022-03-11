from typing import Dict, List

import numpy as np
from os.path import basename, splitext
from qgis.core import \
    QgsRasterLayer, \
    QgsMultiBandColorRenderer, \
    QgsPalettedRasterRenderer, \
    QgsSingleBandGrayRenderer, \
    QgsSingleBandPseudoColorRenderer, \
    QgsHillshadeRenderer
from qgis.PyQt.QtCore import QDate
from osgeo import gdal


class RtmRasterTimeseries(object):

    def __init__(self, layer):

        if isinstance(layer, QgsRasterLayer):
            self._layer = layer
            self._dates, self._bands, self._wavelength, self._numberOfObservations, self._numberOfBands = self._deriveInformation(layer=layer)
            self._currentIndex = -1
            self._valid = True
        else:
            self._layer = None
            self._dates = self._bands = self._wavelength = self._numberOfObservations = self._numberOfBands = None
            self._currentIndex = None
            self._valid = False

        self.lastIndex = -1

    def layer(self):
        return self._layer

    def dates(self):
        return self._dates

    def decimalYears(self):
        return [self.convertToDecimalYear(d) for d in self.dates()]

    def bands(self):
        return self._bands

    def wavelength(self):
        return self._wavelength

    def numberOfBands(self):
        return self._numberOfBands

    def numberOfObservations(self):
        return self._numberOfObservations


    def isValid(self):
        return self._valid

    @classmethod
    def _deriveFromDescriptions(cls, descriptions):
        dates = list()
        names = list()
        wavelengths = list()
        units = list()
        for dateNameWavelengthUnits in descriptions:
            # expected format: <date> - <name> (<wl> <wl unit>)
            # example: 2018-12-31 - blue (0.483 Micrometers)
            sep = ' - '
            i = dateNameWavelengthUnits.find(sep)
            if i == -1:
                return None
            date = dateNameWavelengthUnits[:i].strip()
            nameWavelengthUnits = dateNameWavelengthUnits[i + len(sep):].strip()
            if nameWavelengthUnits.endswith(')'):
                i = nameWavelengthUnits.rfind('(')
                name = nameWavelengthUnits[:i].strip()
                wavelength, unit = nameWavelengthUnits[i+1:].replace(')', '').split(' ')
                wavelength = float(wavelength)
            else:
                wavelength = unit = None

            y, m, d = map(int, date.split('-'))
            date = QDate(y, m, d)
            dates.append(date)
            names.append(name)
            wavelengths.append(wavelength)
            units.append(unit)
        return dates, names, wavelengths, units

    @classmethod
    def _deriveFromTimeseriesDomainMetadata(cls, metadata):

        def toArray(s, dtype=str):
            if s is None:
                return None
            else:
                return [dtype(v.strip()) for v in s.replace('{', '').replace('}', '').split(',')]

        if metadata.get('dates') is None:
            return None
        if metadata.get('names') is None:
            return None

        dates_ = [QDate.fromString(datestamp, 'yyyy-MM-dd') for datestamp in toArray(metadata['dates'], dtype=str)]
        names_ = toArray(metadata['names'])

        wavelengths_ = metadata.get('wavelength')
        if wavelengths_ is None:
            wavelengths_ = [None] * len(names_)
        else:
            wavelengths_ = toArray(wavelengths_, float)

        # convert into redundant format
        dates = [dates_[i] for i in range(len(dates_)) for _ in range(len(names_))]
        names = names_ * len(dates_)
        wavelengths = wavelengths_ * len(dates_)
        units = ['Nanometers'] * len(wavelengths)

        return dates, names, wavelengths, units


    @classmethod
    def _deriveFromEnviDomainMetadata(cls, metadata):

        def toArray(s, dtype=str):
            if s is None:
                return None
            else:
                return [dtype(v.strip()) for v in s.replace('{', '').replace('}', '').split(',')]

        if metadata.get('wavelength') is None:
            return None
        else:
            units = metadata.get('wavelength_units', 'decimal years')
            if units.lower() == 'decimal years':
                dyears = toArray(metadata['wavelength'], dtype=float)
                leap = lambda dy: QDate.isLeapYear(int(dy))
                dyearToDate = lambda dy: QDate(int(dy), 1, 1).addDays(
                    round((dy - int(dy)) * 366) - (0 if leap(dy) else 1))
                dates = [dyearToDate(dy) for dy in dyears]
            else:
                return None

        if metadata.get('band_names') is None:
            return None
        else:
            names = toArray(metadata['band_names'])
            # strip date and wavelength
        #            names = [name.split('(')[0].strip() for name in names]
        #            names = [name.split('(')[0].strip() for name in names]

        wavelengths = metadata.get('center_wavelength')
        if wavelengths is None:
            wavelengths = [None] * len(names)
        else:
            wavelengths = toArray(wavelengths, float)

        unit = metadata.get('center_wavelength_units')
        units = [unit] * len(names)

        return dates, names, wavelengths, units

    @classmethod
    def _deriveFromForceDomainMetadata(cls, metadatas: List[Dict]):
        dates = list()
        names = list()
        for metadata in metadatas:
            date = metadata.get('Date')
            name = metadata.get('Domain')
            if date is None or name is None:
                return None
            y, m, d = map(int, date[:10].split('-'))
            date = QDate(y, m, d)
            dates.append(date)
            names.append(name)

        wavelengths = [None] * len(names)
        units = [None] * len(names)
        return dates, names, wavelengths, units

    @classmethod
    def _deriveFromFallback(cls, layer):
        date0 = QDate(2000, 1, 1)
        dates = [date0.addDays(i) for i in range(layer.bandCount())]
        names = [splitext(basename(layer.source()))[0]]
        wavelengths = [None]
        units = [None]
        return dates, names, wavelengths, units

    @classmethod
    def _deriveInformation(cls, layer):
        assert isinstance(layer, QgsRasterLayer)

        ds = gdal.Open(layer.source())
        info = cls._deriveFromTimeseriesDomainMetadata(ds.GetMetadata('TIMESERIES'))
        if info is None:
            info = cls._deriveFromEnviDomainMetadata(ds.GetMetadata('ENVI'))
            if info is None:
                info = cls._deriveFromForceDomainMetadata([ds.GetRasterBand(i+1).GetMetadata('FORCE') for i in range(ds.RasterCount)])
                if info is None:
                    info = cls._deriveFromDescriptions([ds.GetRasterBand(i + 1).GetDescription() for i in range(ds.RasterCount)])
                    if info is None:
                        info = cls._deriveFromFallback(layer=layer)
        dates_, names_, wavelengths_, units_ = info

        names = [names_[0]]
        for name in names_[1:]:
            if name == names_[0]:
                break
            else:
                names.append(name)

        numberOfBands = len(names)
        numberOfObservations = int(ds.RasterCount / numberOfBands)
        dates = dates_[::numberOfBands]

        if wavelengths_[0] is None:
            wavelengths = None
        else:
            wavelengths = list()
            for w, u in zip(wavelengths_[:numberOfBands], units_[:numberOfBands]):
                if u.lower() in ['Nanometers']:
                    pass
                elif u.lower() in ['Micrometers']:
                    w = w * 1000
                wavelengths.append(w)

        for date in dates:
            assert isinstance(date, QDate)
        return dates, names, wavelengths, numberOfObservations, numberOfBands

    def findDateIndex(self, date, snap):
        if self.isValid():
            if snap == 'nearest':
                dist = [abs(date.daysTo(d)) for d in self._dates]
            elif snap == 'next':
                dist = np.array([date.daysTo(d) for d in self._dates], dtype=np.float32)
                dist[dist < 0] = np.inf
            elif snap == 'previous':
                dist = np.array([-date.daysTo(d) for d in self._dates], dtype=np.float32)
                dist[dist < 0] = np.inf
            else:
                raise Exception('unknown mode: {}'.format(snap))

            index = len(dist) - dist[-1::-1].index(min(dist)) -1

        else:
            index = -1

        return index

    def setDateIndex(self, index):
        renderer = self._layer.renderer()
        bandNumber = lambda number: ((number - 1) % self._numberOfBands + 1) + (index * self._numberOfBands)
        if isinstance(renderer, QgsMultiBandColorRenderer):
            renderer.setRedBand(bandNumber(renderer.redBand()))
            renderer.setGreenBand(bandNumber(renderer.greenBand()))
            renderer.setBlueBand(bandNumber(renderer.blueBand()))
        elif isinstance(renderer, QgsPalettedRasterRenderer):
            # renderer.setBand(bandNumber(renderer.band()))
            assert NotImplementedError()  # question posted https://gis.stackexchange.com/questions/315160/how-to-set-a-new-raster-band-to-a-qgspalettedrasterrenderer-object
        elif isinstance(renderer, QgsSingleBandGrayRenderer):
            renderer.setGrayBand(bandNumber(renderer.grayBand()))
        elif isinstance(renderer, QgsSingleBandPseudoColorRenderer):
            renderer.setBand(bandNumber(renderer.band()))
        elif isinstance(renderer, QgsHillshadeRenderer):
            renderer.setBand(bandNumber(renderer.band()))
        elif renderer is None:
            pass
        else:
            raise NotImplementedError('renderer not supported: {}'.format(renderer))

    @staticmethod
    def convertToDecimalYear(date):
        assert isinstance(date, QDate)
        year = date.year()
        daysInYear = 365 + (1 if QDate.isLeapYear(year) else 0)
        decimal = QDate(year, 1, 1).daysTo(date) / (daysInYear)
        return year + decimal
