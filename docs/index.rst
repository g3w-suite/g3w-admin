.. G3W-SUITE documentation master file, created by
   sphinx-quickstart on Thu Jun 16 12:13:37 2016.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

=====================================
Welcome to G3W-SUITE's documentation!
=====================================
**G3W-SUITE is a frame-work, based on Django and written in Python language, which allows to manage in an integrated way the different components of QGIS for the realization of its own Geographic Information System and for the publication on WebGis of its own projects in a simple and intuitive way.**

G3W-SUITE is entirely based on tested Open Source software components built around QGIS:

- **QGIS Desktop:** for cartographic data management, editing and realization of high quality graphic projects

- **QGIS Server:** for the publication of QGIS projects as OGC services

**The current development policy provides for the compatibility of the G3W-SUITE application only with the latest LTR version of QGIS**

**The current release is compatible with QGIS 3.10 LTR (Server and Desktop).**

G3W-SUITE is a modular client-server application for the publication and management of QGIS cartographic projects, consisting of 2 components:

- **G3W-ADMIN:** Administration component (project management, ACL, OGC proxy server, API rest server)

- **G3W-CLIENT:** Cartographic client for consultation and interaction with OGC services


Optional OS modules are:

- **Front-end geographic portal:** access to information, thematic groups and WebGis services

- **Caching Module:** tile caching module for single layer powerd by TileStache4


Through the web interface of the G3W-SUITE framework it is possible to:

- **publish QGIS projects** directly on WebGis in a structured way

- **organize webgis services in thematic-functional containers** of various levels

- **manage users and groups of users** by defining each of them **different functional roles**

- **create and manage research methods**

- allow **online editing**

- activate **specific functional modules**

- **define permissions to access services and to use functional modules** at the individual user level

.. image:: images/install/admin.jpg
.. image:: images/install/client.jpg

.. toctree::
   :maxdepth: 2
   :hidden:
   :caption: Installation and deploy

   install
   docker
   settings


.. toctree::
   :maxdepth: 2
   :caption: Manual

   introduction
   infrastructure
   datamanagement
   user_groups_organization
   projectsettings
   g3wsuite_access_portal
   g3wsuite_administration
   g3wsuite_client
   g3wsuite_editing

.. toctree::
   :maxdepth: 2
   :caption: Tutorial

   demo


