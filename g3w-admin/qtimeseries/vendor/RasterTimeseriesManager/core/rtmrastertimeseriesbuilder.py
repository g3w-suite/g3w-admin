from os.path import dirname, join, splitext, exists
from os import makedirs, walk
from qgis.PyQt.QtCore import QDate
from osgeo import gdal


class RtmRasterTimeseriesBuilder(object):

    class SourceBand(object):

        def __init__(self, filename, band):
            assert isinstance(filename, str)
            assert isinstance(band, int)
            self.filename = filename
            self.band = band

    def __init__(self):
        self._sources = dict()

    def addSource(self, name, date, filename, band):
        key = (name, date)
        if key not in self._sources:
            self._sources[key] = list()
        self._sources[key].append(self.SourceBand(filename=filename, band=band))

    def parse(self, folder):
        for root, dirs, files in walk(folder):
            for file in files:
                file, extension = splitext(file)
                if extension not in self.extensions:
                    continue

                if not self.isValidRaster(root=root, file=file):
                    continue

                filename = join(root, file+extension)

                if extension == '.nc':
                    'NETCDF: "PhytoDOAS-PFT-v3.3_200208":CYA'

                ds = gdal.Open(filename)
                assert isinstance(ds, gdal.Dataset)
                if ds.GetDriver().ShortName in ['netCDF']:
                    datasets = [(uri, uri.split(':')[-1]) for uri, desc in ds.GetSubDatasets()]
                else:
                    datasets = [(filename, None)]

                for uri, variable in datasets:
                    ds = gdal.Open(uri)
                    assert isinstance(ds, gdal.Dataset)
                    for band in range(1, ds.RasterCount+1):
                        if self.isValidBand(root=root, file=file, band=band):
                            name = self.name(root=root, file=file, subdataset=variable, band=band)
                            date = QDate(*self.date(root=root, file=file, band=band))
                            self.addSource(name, date, uri, band)

    def isValidRaster(self, root, file):
        return True

    def isValidBand(self, root, file, band):
        return True

    def dates(self):
        dates = list()
        for (name, date) in self._sources:
            dates.append(date)
        dates = sorted(set(dates), key=QDate.toJulianDay)
        return dates

    def date(self, root, file, band):
        raise NotImplementedError()

    def name(self, root, file, subdataset, band):
        raise NotImplementedError()

    def buildVrt(self, filename):

        # build band mosaics
        mosaicsFilenames = list()
        for date in self.dates():
            for name in self.names:
                filenames = list()
                bands = list()

                for sourceBand in self._sources[name, date]:
                    assert isinstance(sourceBand, self.SourceBand)
                    filenames.append(sourceBand.filename)
                    bands.append(sourceBand.band)

                if len(filenames) == 1: # do not build a mosaic if there is only 1 file!
                    mosaicFilename = filenames[0]
                else:
                    # - this will create a vrt where the source band is always zero
                    datestamp = '{}-{}-{}'.format(str(date.year()).zfill(4), str(date.month()).zfill(2), str(date.day()).zfill(2))
                    mosaicFilename = join(splitext(filename)[0], '{}_{}.vrt'.format(datestamp, name))
                    if not exists(dirname(mosaicFilename)):
                        makedirs(dirname(mosaicFilename))
                    vrt = gdal.BuildVRT(destName=mosaicFilename, srcDSOrSrcDSTab=filenames, bandList=[1],
                                        xRes=self.resolution, yRes=self.resolution)
                    vrt.FlushCache()
                    vrt = None

                    # - replace with correct source bands
                    i_band = 0
                    with open(mosaicFilename) as file:
                        lines = file.readlines()
                    for i_line, line in enumerate(lines):
                        if line.strip().startswith('<SourceBand>'):
                            lines[i_line] = '<SourceBand>{}</SourceBand>\n'.format(bands[i_band])
                            i_band += 1
                    with open(mosaicFilename, 'w') as file:
                        file.writelines(lines)

                mosaicsFilenames.append(mosaicFilename)

        # stack band mosaics
        vrt = gdal.BuildVRT(destName=filename, srcDSOrSrcDSTab=mosaicsFilenames, separate=True)
        assert isinstance(vrt, gdal.Dataset)

        # set metadata
        i = 0

        for date in self.dates():
            for name in self.names:
                assert isinstance(date, QDate)
                rb = vrt.GetRasterBand(i+1)
                assert isinstance(rb, gdal.Band)

                datestamp = date.toString('yyyy-MM-dd')
                rb.SetMetadataItem('date', datestamp)
                rb.SetMetadataItem('name', name)

                description = '{} - {}'.format(datestamp, name)
                if self.wavelengths is not None:
                    description += ' ({} Nanometers)'.format(datestamp, name, int(self.wavelengths[i % len(self.names)]))
                rb.SetDescription(description)

                rb.SetNoDataValue(self.noDataValues[i % len(self.names)])
                i += 1

        vrt.FlushCache()
        vrt = None
        return filename

    def toText(self):
        text = list()
        for name, date in self._sources:
            text.append('{} - {}'.format(name, date.toString('yyyy-MM-dd')))
            for sourceBand in self._sources[(name, date)]:
                text.append('{} ({})'.format(sourceBand.filename, sourceBand.band))
            text.append('')
        return '\n'.join(text)

    def fromText(self, text):
        text = text.split('\n')

        def nextBlock(text, i):
            name, datestamp = text[i].split(' - ')
            date = QDate.fromString(datestamp, 'yyyy-MM-dd')
            filenames = list()
            bands = list()
            i += 1
            while text[i].strip() != '':
                tmp = text[i].split(' (')
                filename = tmp[0].strip()
                band = int(tmp[1].replace(')', '').strip())
                filenames.append(filename)
                bands.append(band)
                i += 1
            return name, date, filenames, bands, i+1

        i = 0
        while True:
            name, date, filenames, bands, i = nextBlock(text=text, i=i)
            for filename, band in zip(filenames, bands):
                self.addSource(name=name, date=date, filename=filename, band=band)
            if i == len(text):
                break