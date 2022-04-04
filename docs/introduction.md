# Introduction

**G3W-SUITE is a modular client-server application for the management and publication of interactive map projects.**

The framework was born from the need to have a software capable of **publishing, in total autonomy and in a simple and fast way on a webgis client, cartographic projects realized with [QGIS](https://qgis.org).**

The following aspects will be analyzed within the manual:
* **organization and optimization of data and QGIS projects for web publishing**
* **organization of cartographic contents in a hierarchical way: macro groups and cartographic groups**
* **user management and access control systems for consultation and management of webgis services**
* **management of the online editing function for the creation of web cartographic management systems**
* **publishing and managing QGIS projects as WebGis services**
* **creation of searches, visualization of graphics created with the DataPlotly plugin and definition of constraints (geographic and alphanumeric) on visualization and editing permissions**

**The current release (3.4) is compatible with `QGIS 3.22.x LTR` (Server and Desktop).**

![](images/manual/demo_qgis_project.png)

![](images/manual/demo_webgis_project.png)

### Version

At the moment it's not used a classic versioning system for the suite, this branches are avialable.

| Branch   | Python version | Django version | QGIS        | QGIS API | Status                 |
|----------|----------------|----------------|-------------|----------|------------------------|
| dev      | 3.6            | 2.2            | 3.22        | Used     | Continuous development |
| v3.4     | 3.6            | 2.2            | 3.22        | Used     | Bug fixing             |
| v3.3     | 3.6            | 2.2            | 3.16        | Used     | Bug fixing             |
| v3.2     | 3.6            | 2.2            | 3.16        | Used     | Not longer supported   |
| v3.1     | 3.6            | 2.2            | 3.10        | Used     | Not longer supported   |
| v3.0     | 3.6            | 2.2            | 3.10        | Used     | Not longer supported   |

### Main contributors
* Walter Lorenzetti - Gis3W ([@wlorenzetti](https://github.com/wlorenzetti))
* Leonardo Lami - Gis3W ([@leolami](https://github.com/leolami/))
* Francesco Boccacci - Gis3W ([@volterra79](https://github.com/volterra79))
* Alessandro Pasotti - QCooperative ([@elpaso](https://github.com/elpaso))
* Luigi Pirelli - QCooperative ([@luipir](https://github.com/luipir))
* Mazano - Kartoza ([@NyakudyaA](https://github.com/NyakudyaA)) (Dockerization refactoring)

