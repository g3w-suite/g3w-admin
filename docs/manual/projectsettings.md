# QGIS: cartographic project settings
The cartographic projects created on the QGIS software and dedicated to publication on the WebGis service present some parameters and options that affect the functionality and contents of the WebGis service itself.
In particular, some parameters of the project affect:
* the project identification name once loaded on the G3W-SUITE application
* the associated basic metadata
* the capabilities of the service
* the geographical extension displayed when the WebGis service is started
* the projection systems for which the project is available
* possible exclusion of print layouts on the WebGis service
* possible exclusion of layers on the WebGis service
* which layers are questionable
* which raster layers can be queried in WCS format
* which fields and with which aliases are made visible, following interrogation, for each vector data
* the structure of the query form visible on the WebGis service
      
The following paragraphs describe the settings relating to the QGIS cartographic project which will have the greatest implications in relation to the published WebGis service.

## QGIS: ownership of the project
From the **Project** → **Project Properties** ... menu, access the Project Properties window and from here you can access three submenus whose parameters influence the publication of the WebGis service:
 * General
 * Carrier information
 * OWS server
 
### General
The subsection of interest is exclusively to the first.

#### General Settings
**In this section you define the name of the project.**
This name will be used at the G3W-SUITE application level to uniquely identify the published project; f**or this reason it will not be possible to assign the same name to different projects published on the WebGis service**.
**We strongly advise against using special characters or numbers in the project name.**

![Project title settings](../images/manual/projecttitle.png)

#### Data sources
**This submenu defines the layers that can be queried at the WebGis service level.**

The only column to consider is the one called **Interrogable**.

![Project title settings](../images/manual/datasources.png)

#### QGIS Server
This window is divided into sections that we will analyze below:

##### Capabilities of the service
In this section it is possible to define the capabilities of the product service.

This information, together with that associated with the data structure of the individual project layers, will be displayed associated with the WebGis service in the Metadata session.

![Project title settings](../images/manual/qgisservercapabilities.png)