# G3W-CLIENT: the cartographic viewer
## Generic aspects

The application has a responsive interface consisting of expandable and reducible sessions.
**The header** contains the following elements:
 * **Logo, title and subtitle**, deriving from:
   * main title (set at General Data level) or MacroGroup name, according to the settings
   * Cartographic Group name
   * WebGis service title
 * **Change map:** which allows you to switch from one WebGis service, located within the usual Thematic Group, to another while maintaining extension and display scale
 * **User ID:** if you have logged in to the system
 * **Home:** to access the FrontEnd

![Project title settings](../images/manual/g3wclient_header.png)

Tools panel located on the left and containing the following objects:
 * **Metadata:** content defined on QGIS project
 * **Printing:** printing tool based on the layouts defined on the QGIS project
 * **Searches:** with the search tools defined through the Administration panel
 * **Map:** containing:
   * **Layers:** structured list of layers, defined on the QGIS project
   * **Bases:** choice of the base map from those defined at the creation level of the Thematic Group
   * **Legend:** graphic legend of the various layers
 * **Tools:** session that collects the various tools that may be activated on the WebGis service

![Project title settings](../images/manual/g3wclient_tool_panel.png)

The centrally located map area which presents the various map controls for navigation and interaction with the map, map controls defined at the Cartographic Group level.

## Navigazione e interazione con la mappa
The icons and description of the functions of the various MapControls activated at the thematic group level are shown below.

 * **zoomtoextent:** zoom to the initial extension
 * **zoom:** zoom in and zoom out
 * **zoombox:** zoom tool based on drawing a rectangle
 * **query:** precise query of geographical layers
 * **querybbox:** query via layer box - **N.B.** the questionable layers must be published as WFS services on the QGIS project
 * **querybypolygon:** it will be possible to automatically query the features of one or more layers that fall within a polygonal element of a guide layer. (Eg what's inside a cadastral parcel?). - **N.B.** the questionable layers must be published as WFS services on the QGIS project
 * **overview:** presence of a panoramic map
 * **scaleline:** presence of the scale bar
 * **scale:** tool for defining the display scale
 * **mouseposition:** display of mouse position coordinates
 * **geolocation:** geolocation tool (useful for consultation from tablet)
 * **nominatin:** search tools for addresses and toponyms based on OSM
 * **streetview:** Google StreetView on your map
 * **length:** measuring instrument for linear strokes
 * **area:** tool for measuring surfaces
 * **addlayers:** tool for temporarily uploading .kml and .shp (zipped) vector layers to WebGis
 * **snapshot:** tool for taking snapshots of the map area

It should be noted that the query function acts, by default, with the coring method, providing information relating to all the layers underlying the point where you click with the mouse or draw a box.

To query a single layer, it must be previously selected at the TOC level.

Remember that query modes based on **querybbox** and **querybypolygon** require the publication of the layers as WFS services at the QGIS project level.

**NB:** Remember that, after viewing the results, it will be possible to zoom in on the feature associated with the individual results only if the option **'Add geometry to object response'** has been activated at the Project menu level at the QGIS project level → Project properties, QGIS Server session.

### Form of results

In the event that, at the QGIS project level (Vector properties → Attributes Form), specific forms have been defined on one or more layers for the structured display of the results of a query (cards, groups ...), the same form will be reported at the query level on the map client.

![Project title settings](../images/manual/g3wclient_view.png)

Any links to photos will determine the display of a clickable preview, any links to links or other multimedia content will determine the display of the Open button that will allow consultation of the link.

For further information on this point, see the paragraph “Displaying multimedia content”.

### Display of type 1 relations: n

In the event that, at the QGIS project level, one or more type 1: n relationships have been associated with a layer, following a query/search applied to the layer itself, the icon "View Relationships” ![Project title settings](../images/manual/icon_relations.png)

By clicking on the icon you will access the list of relationships present and, from these, the list of child records associated with the individual relationships. In the case of a single 1: n relationship, the child layers of the relationship in question will be displayed directly.

A filter, applied generically to the contents of all fields, will allow you to filter the list of child records.

![Project title settings](../images/manual/g3wclient_relations_view.png)

In the case of links to multimedia contents, the previews of the images and / or the Open button will be displayed for consultation of different types of content.

## Tools panel
### Metadata
The metadata reported in this session derive from those set at the QGIS project level.

This content is divided into three sessions: **General, Space Info and Layers.**
 * **General:** reports the metadata defined on the QGIS project at the menu level Project → Project Properties, OWS Server session, Service Capabilities.
   In case of login as anonymous user in this session there is also the URL of the tael project WMS service.
 * **Space Info:** reports the EPSG code of the projection system associated with the QGIS project and the BoundingBox relating to the initial publication extension, defined at the menu level Project → Project Properties, OWS Server session, WMS Capabilities, Published extension
 * **Layers:** reports the metadata associated with the individual layers. Metadata defined at the Layer Properties level

![Project title settings](../images/manual/g3wclient_metadata_view.png)

### Print
Printing tool based on layouts defined on QGIS project.

The tool allows you to choose:
 * **Template:** print layout among those associated with the published QGIS project
 * **Scale:** print scale
 * **DPI:** print resolution
 * **Rotation:** rotation angle
 * **Format:** print to PDF or JPEG

On the map, a lit rectangular area will allow you to define the print area.

![Project title settings](../images/manual/g3wclient_print_tool.png)

### Searches
The Research menu contains the list of search tools defined through the Administration panel.

You choose the search you are interested in, fill in the required fields and click on the **Search** button.

The panel with the list of results will open on the right side of the client, for each result the first three fields of the associated table will be displayed.

By positioning on the individual results, the corresponding features will be highlighted on the map; clicking on the individual results you can consult all the attributes associated with the feature.

The drop-shaped icons will allow you to zoom in on the extension relating to the resulting overall features or that of the individual features.

The **CSV icon** allows you to download the attributes associated with the resulting features in CVS format.

![Project title settings](../images/manual/g3wclient_search_example.png)

### Map
 * **Layers:** structured list of layers, defined on the QGIS project
 * **Bases:** choice of the base map from those defined at the Cartographic Group creation level
 * **Legend:** graphic legend of the various layers
   The right button on the name of the single layer shows the following items:
 * **Zoom to layer:** to zoom in on the extension of the layer
 * **Open the attribute table:** to consult the associated attribute table *
 * **Download shapefile:** to download the layer as a shapefile; available only for PostGis and SpatiaLite layers following activation of the function from the administration panel
 * **WMS URL:** URL of the WMS service relative to the project, or URL of the WMS service originating from any WMS layer

The attribute table is equipped with paging function, highligth function and zooming to the associated features.

In the case of links to multimedia content, the previews of the images and/or the **Open** button will be displayed for consultation of different types of content.

A filter, applied generically to the contents of all the fields, will allow you to filter the list of displayed records.

![Project title settings](../images/manual/g3wclient_table_view.png)

