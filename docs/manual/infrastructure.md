# Technological infrastructure

G3W-SUITE is a modular client-server application for the management and publication of interactive map projects.

Its development was born from the need to have a software capable of publishing, in total autonomy and quickly and easily on a webgis client, GIS cartographic projects of various nature (in particular QGIS, but also MapServer, GeoServer, OGC , etc).

The need to have a management application to be inserted in structured contexts such as public bodies, parks, companies, etc. was the engine that led to develop aspects related to:
      
* organization of cartographic contents in a hierarchical way: macro groups and cartographic groups
* access control systems for administration and consultation of projects
* editing functionality and of the various modules, based on an editable and configurable user profiling system, also of a hierarchical type

The publishing system is based on a series of OS tools and software

![G3W-SUITE Infrastructure](../images/manual/architecture.png)

* PostgreSQL / PostGis or SpatiaLite: for the management of geographic data
* G3W-ADMIN was developed in Python using Django
* G3W-CLIENT was developed using the AdminLTE base template.
* The main libraries used for the management and the visualization of the geographical part and the interaction with the user are: OpenLayer, Boostrap, jQuery, Lodash and Vue.js. 
* As a task runner Gulp.js