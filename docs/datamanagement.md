#  Management and organization of geographic data and QGIS projects
_**This section describes how to organize QGIS data and projects locally and how to synchronize them on the server environment for publication purposes**_

## Data on PostGreSQL/PostGis DB

If your geographical data are stored on `PostGreSQL/PostGis` DB, it will be sufficient to allow access to the GeoDB from the IP address on which the application is installed.

## Data on SpatiaLite or on other file system format
If your geographical data are stored on `SpatiaLite` or on physical files (`.shp`, `.kml`, `.tif` ...) located on your local PC, you will need:
* **organize data and projects** in predefined localy directories and subdirectories
* **upload/synchronize geographic data to the corresponding folder located on the server** where the application is installed

**Of course, mixed solutions with geographical data on PostGreSQL/PostGis, SpatiaLite and other formats will also be possible.**

### Organization of data and projects

Data on physical files and / or on GeoDB SpatiaLite and QGIS cartographic projects must be organized in compliance with the following indications:
 * a **main directory** named and positioned in according to need's user
   * a **`geo_data`* sub-directory** that must contain the **geographic data** used for the various cartographic projects, such data can also be organized in subdirectories with no nesting limits.
   * a **`projects` sub-directory** that must contain the **QGIS cartographic projects** (.qgz or .qgs files)

![](images/manual/datamanagement.png)

**NB:** The name of the local directory dedicated to geographic data must correspond to the name defined for the **`DATASOURCE_PATH`** variable set during installation.
[See dedicated paragraph.](https://g3w-suite.readthedocs.io/en/latest/settings.html#base-settings)

That directory is also used to contain **images used in the print layouts** associated with the QGIS cartographic projects.

### Geographic data synchronization on the server

The data stored in the local **`geo_data`** directory must be synchronized on the server where the G3W-SUITE application is installed.

The geographic data stored in the local **`geo_data`** folder must be loaded, reflecting any subdirectory structure.

To synchronize your data access to the Administration panel of G3W-ADMIN and click on the the **`Configurations` icon** ![](images/manual/iconconfiguration.png) located in the upper right corner.

Choose the **`File Manager`** item in the linked menù.

![](images/manual/g3wclient_icon_config.png)

![](images/manual/g3wsuite_administration_configuration_menu.png)

Using this tool it is possible to manage the physical geographic data on the server in a simple and intuitive way.

This the directories present by default:
 * **`geo_data`**: the folder in which to store the **geographical data** and any **images inserted in the print layouts**
 * **`media_user`**: a folder exposed on the web, to store your **multimedia files**
 * **`svg:`** a folder to store **extra SVG icons** used your QGIS projects

All the folder can be organized in subdirectories with no nesting limits.

**NB:** The names of these directories are defined by the basic settings set during the installation of the suite.
[See dedicated paragraph.](https://g3w-suite.readthedocs.io/en/latest/settings.html#base-settings)


![](images/manual/g3wsuite_administration_file_manager.png)
