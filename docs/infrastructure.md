# Technological infrastructure

The publishing system is based on a series of OS tools and software

* **`PostgreSQL/PostGis`**: for the management of application data
* **`PostgreSQL/PostGis` or `SpatiaLite`**: for the management of gegraphic data
* **`QGIS Server LTR`** as OGC services server
* **`G3W-ADMIN` - the Administration component**: developed in **`Python`** using **`Django`**
* **`G3W-CLIENT` - the Cartographic client**: based on **`OpenLayer3`** and developed with **reactive tecnology by `Vue.js`**
* The main libraries used for the management and the visualization of the geographical part and the interaction with the user are: **`OpenLayer, Boostrap, jQuery, Lodash` and `Vue.js`**. 
* **`Gulp.js`** as task runner

![](images/manual/architecture.png)

Below is a diagram relating to the standard workflow

![](images/manual/architecture_workflow.png)

