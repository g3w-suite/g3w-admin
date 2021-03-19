# Introduction

**G3W-SUITE is a modular client-server application for the management and publication of interactive map projects.**

The framework was born from the need to have a software capable of **publishing, in total autonomy and in a simple and fast way on a webgis client, cartographic projects realized with [QGIS](https://qgis.org).**

The following aspects will be analyzed within the manual:
* **organization and optimization of data and QGIS projects for web publishing**
* **organization of cartographic contents in a hierarchical way: macro groups and cartographic groups**
* **user management and access control systems for consultation and management of webgis services**
* **management of the online editing function for the creation of web cartographic management systems**

**The current release (3.1) is compatible with `QGIS 3.10.x LTR` (Server and Desktop).**

![](images/manual/demo_qgis_project.png)

![](images/manual/demo_webgis_project.png)

### Version

At the moment is not used a classic versioning system for the suite, there are main 3 branches.

| Branch | Python version | Django version | QGIS API |Status |
|--------|----------------|----------------|----------|-------|
| dev | 3.6 | 2.2 | Used | Continue developing |
| v.3.2.x | 3.6 | 2.2 | Used | Bug fixing |
| v.3.1.x | 3.6 | 2.2 | Used | Bug fixing |
| v.3.0.x | 3.6 | 2.2 | Used | No longer supported |
| dj22-py3 | 3.6 | 2.2 | Not used | No longer supported  |
| py2 | 2.7 | 1.11 | Not used |No longer supported  |

### Contributors
* Walter Lorenzetti - Gis3W ([@wlorenzetti](https://github.com/wlorenzetti))
* Leonardo Lami - Gis3W ([@leolami](https://github.com/leolami/))
* Francesco Boccacci - Gis3W ([@volterra79](https://github.com/volterra79))
* Alessandro Pasotti - QCooperative ([@elpaso](https://github.com/elpaso))
* Luigi Pirelli - QCooperative ([@luipir](https://github.com/luipir))
* Mazano - Kartoza ([@NyakudyaA](https://github.com/NyakudyaA)) (Dockerization refactoring)

