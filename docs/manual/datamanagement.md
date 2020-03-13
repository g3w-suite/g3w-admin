# Geographic data management and organization
## Data on GeoDatabase PostGis

If the geographical data used to carry out your cartographic projects with QGIS are located on GeoDatabase PostGis, it will be sufficient to allow access to the DB from the IP address on which the application is installed.

## Data on GeoDatabase SpatiaLite or data on file system

If the geographical data used to carry out your cartographic projects with QGIS are located on SpatiaLite Geodatabase or on physical files (.shp, .kml, .tif ...) located on your local PC, you will need:
* organize data and projects in predefined directories and subdirectories
* upload / synchronize geographic data to the default folder located on the server where the application is installed

**Of course, mixed solutions with geographical data on PostGis, SpatiaLite and other formats will also be possible.**

## Organization of data and projects

Data on physical files and / or on GeoDB SpatiaLite and QGIS cartographic projects must be organized in the manner and with the following names:
* the main directory can be named and positioned at will by the user.
* the subdirectory geographic_data must contain the geographic data used for the various cartographic projects to be published, such data can also be organized in subdirectories with no nesting limits.

    This directory must also contain any images used to create the various print layouts associated with the individual cartographic projects.
* the projects sub-directory must contain the individual QGIS cartographic projects (.qgs file) to be published.

![Data management](../images/manual/datamanagement.png)

## Geographic data synchronization

In the case of physical files, the geographic data present in the geographic_data directory must be synchronized with that present in the homonymous directory on the server where the G3W-SUITE application is installed.

Within this directory, the physical geographic files listed locally in the geographic_data folder must be loaded, reflecting any subdirectory structure.

In the Administration panel the Configurations icon ![Configuration icon](../images/manual/rightmenuicon.png) located in the upper right corner allows you to access a menu that includes the File Manager item.

Using this tool it is possible to manage the physical geographic files on the server in a simple and intuitive way.

*PS: remember that the File Manager tool also allows you to manage any additional SVG icons and multimedia files. See dedicated paragraphs.*



