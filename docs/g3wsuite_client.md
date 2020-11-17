# G3W-CLIENT: the cartographic viewer
## Generic aspects

The application has a responsive interface consisting of expandable and reducible sessions.

The color of the interface depends on the type of user logged in.

![](images/manual/g3wclient_interface.png)

**`The header`** contains the following elements:
 * **Logo, title and subtitle**, deriving from:
   * main title (set at General Data level) or MacroGroup name, according to the settings
   * Cartographic Group name
   * WebGis service title
 * **Change map:** which allows you to switch from one WebGis service to another (located within the same Cartographic Group) while maintaining extension and display scale
 * **User ID:** if you have logged in to the system
 * **Credits**
 * **Home:** to access the FrontEnd
 * **Language:** the choice of language is reflected in the individual menus of the map client and on the contents of the access portal. The languages available are those activated by the Administration. 

![](images/manual/g3wclient_header.png)

The **`Tools panel`** is located on the left and containing the following objects:
 * **Metadata:** content defined on QGIS project
 * **Print:** printing tool based on the layouts defined on the QGIS project
 * **Search:** with the search tools defined through the Administration panel
 * **Tools:** session that collects the various tools that may be activated on the WebGis service
 * **Map:** containing:
   * **Layers:** structured list of layers, defined on the QGIS project
   * **Base:** choice of the base map from those defined at the creation level of the Thematic Group
   * **Legend:** graphic legend of the various layers

![](images/manual/g3wclient_tool_panel.png)

The centrally located **`map area`** presents the various navigation and map interaction controls, this controls are defined at the Cartographic Group level.

## Navigation and interaction with the map

### Map area

At the base of the map area there is an information bar showing:
 * **display scale**
 * **mouse coordinates**
 * **project projection system**
 * **icon to copy the URL with the references to the extension currently displayed**
 
![](images/manual/g3wclient_tool_panel.png)

![](images/manual/g3wclient_footer2.png)

 
### Map controls

**The icons and description of the functions of the various **`MapControls`** activated at the thematic group level are shown below.**

 * ![ ](images/manual/icon_navigation_fitextent.png) **`zoomtoextent`:** zoom to the initial extension
 * ![ ](images/manual/icon_navigation_zoomin.png) **`zoom`:** zoom in and zoom out
 * ![ ](images/manual/icon_navigation_zoomtobox.png) **`zoombox`:** zoom tool based on drawing a rectangle
 * ![ ](images/manual/icon_navigation_querylayer.png) **`query`:** puntual query of geographical layers
 * ![ ](images/manual/icon_navigation_querybox.png) **`querybbox`:** query via bounding box - **N.B.** for the layers to be queried according to this method it is necessary that they are published as WFS services on the QGIS project
 * ![ ](images/manual/icon_navigation_querypoligon.png) **`querybypolygon`:** it will be possible to automatically query the features of one or more layers that fall within a polygonal element of a guide layer. (Eg what's inside a cadastral parcel?). - **N.B.** the questionable layers must be published as WFS services on the QGIS project
 * ![ ](images/manual/icon_navigation_geolocation.png) **`geolocation`:** geolocation tool (useful for consultation from tablet)
 * ![ ](images/manual/icon_navigation_nominatim.png) **`nominatin`:** search tools for addresses and toponyms based on OSM
 * ![ ](images/manual/icon_navigation_streetview.png) **`streetview`:** Google StreetView on your map
 * ![ ](images/manual/icon_navigation_lunghezza.png) **`length`:** linear measuring instrument
 * ![ ](images/manual/icon_navigation_area.png) **`area`:** tool for measuring surfaces
 * ![ ](images/manual/icon_navigation_addlayer.png) **`addlayers`:** tool for temporarily uploading GeoJson ,KML and SHP (zipped) vector layers to WebGis
 * ![ ](images/manual/icon_navigation_snapshot.png) **`snapshot`:** tool for taking snapshots of the map area

It should be noted that the query function acts, by default, with the coring method, providing information relating to all the layers underlying the point where you click with the mouse or draw a box.

To query a single layer, it must be previously selected at the TOC level.

Remember that query modes based on **querybbox** and **querybypolygon** require the publication of all the layers involved as WFS services at the QGIS project level.

**NB:** Remember that, after viewing the results, it will be possible to zoom on the feature associated with the individual results only if the option **`Add geometry to object response`** has been activated at the QGIS project level (**`Project → Properties, QGIS Server session`**).

### Attributes form

In the QGIS project (**`Vector properties → Attributes Form`**), you can create custom attribute forms (tabs, groups ...)

The same structured form will be reported at the query level on the cartographic client.

The window is resizable.

![](images/manual/g3wclient_attribute_view.png)

Any links to photos will determine the display of a clickable preview, any links to links or other multimedia content will determine the display of the Open button that will allow consultation of the link.

For further information on this point, see the [**dedicated paragraph**](https://g3w-suite.readthedocs.io/it/v.3.1.x/projectsettings.html#viewing-multimedia-content).

The orange bar above the query results shows the following icons:
![](images/manual/g3wclient_attribute_icons.png)

 * Zoom to features: if the function is activated on the Properties of the QGIS project
 * Show relations (1: N): if present on the GQIS project
 * Download Shapefile: if activated in the administration session
 * Download GPX: if activated in the administration session
 * Download SCV download: if activated in the administration session
 * Download XLS: if activated in the administration session
 * Print Atlas: prints the atlas sheet (if set on QGIS project) related to the queried feature

### Display of 1:n relation data

In the event that, at the QGIS project level, one or more type 1: n relationships have been associated with a layer, the icon **View Relationships**  will be shown in the attribute form.

By clicking on the icon you will access the list of relationships present and, from these, the list of child records associated with the individual relationships. In the case of a single 1: n relationship, the child layers of the relationship in question will be displayed directly.

The icon to the left of each record allows you to switch from the classic table view to the one based on any form defined on the QGIS project

A filter, applied generically to the contents of all fields, will allow you to filter the list of child records.

![](images/manual/g3wclient_relations_view.png)

In the case of links to multimedia contents, the previews of the images and/or the **`Open` button** will be displayed for consultation of different types of content.

## Tools panel
### Metadata
The metadata reported in this session derive from those set at the QGIS project level.

This content is divided into three sessions: **General, Space Info and Layers.**
 * **`General`:** reports the **metadata defined on the QGIS project** in the item: **`Project →  Properties (QGIS Server session, Service Capabilities)`**
   In case of login as anonymous user the URL of the WMS service is shown.
 * **`Spatial`:** reports the **EPSG code** of the projection system associated with the QGIS project and the **BoundingBox** relating to the initial publication extension, defined in the item: **`Project →  Properties (QGIS Server session, WMS Capabilities, Advertised extent)`**
 * **`Layers`:** reports **simple metadata associated with the individual layers**.

![](images/manual/g3wclient_metadata_view.png)

### Charts
**View graphs created using QGIS [DataPlotly](https://github.com/ghtmtt/DataPlotly) and activated at the admin session level.**

Check the plots in the list and view on the rigth panel

![](images/manual/g3wclient_plots_view.png)

Plots based on visible or selected geometries will be available in the next version

### Print
**Printing tool based on layouts defined on QGIS project.**

The tool allows you to choose:
 * **Template:** print layout among those associated with the published QGIS project
 * **Scale:** print scale
 * **DPI:** print resolution
 * **Rotation:** rotation angle
 * **Format:** print to PDF or JPEG

On the map, a lit rectangular area will allow you to define the print area.

![](images/manual/g3wclient_print_tool.png)

If an **Atlas type print layout** is associated in the QGIS project, the layout reference will be available.
The cards to be printed are defined by referring to the atlas identifier defined in the print layout.

![](images/manual/g3wclient_print_tool_atlas.png)


### Search and Query Builder

A classic Query Builder is present at the Search menu level.
Through this tool it is possible to:
 * carry out alphanumeric searches on geometric layers
 * save the query to reuse it until the end of the work session
 * edit a previously saved query
 
The saved query will be available until the browser cache is cleared

![](images/manual/g3wclient_querybuilder.png)

**The Search menu contains the list of search tools defined through the Administration panel and custom searches created with the Query Builder.**

![](images/manual/g3wclient_searc_list.png)


You choose the search you are interested in, fill in the required fields and click on the **`Search` button**.

The **panel with the list of results** will open on the right side of the client, for each result the first three fields of the associated table will be displayed.

By positioning on the individual results, the corresponding features will be highlighted on the map; clicking on the individual results you can consult all the attributes.

Zoom to features and download icons are available for results (single or cumulative)

![](images/manual/g3wclient_search_example.png)

### Map

This session has three tabs:
 * **Layers:** structured list of layers, defined on the QGIS project
 * **Base:** choice of the base map from those defined at the Cartographic Group creation level
 * **Legend:** graphic legend
 
In the list of layers, right click on the name of the single layer shows the following items:
 * **Name and kind of geometry** of the layer
 * **Zoom to layer:** to zoom in on the extension of the layer
 * **Open attribute table:** to consult the associated attribute table
 * **Download shapefile:** to download the layer as a shapefile; function activable from the administration panel
 * **Download CSV:** to download the layer as a CSV; function activable from the administration panel
 * **Download XLS:** to download the layer as a XLS; function activable from the administration panel
 * **WMS URL:** URL of the WMS service relative to the project or URL of the external WMS

![](images/manual/g3wclient_layer_function.png)

The attribute table is equipped with **paging function, highligth function and zooming** to the associated features.

In the case of links to **multimedia content**, the previews of the images and/or the **Open** button will be displayed for consultation of different types of content.

**A filter**, applied generically to the contents of all the fields, will allow you to filter the list of displayed records.

The window is resizable.

![](images/manual/g3wclient_table_view.png)

