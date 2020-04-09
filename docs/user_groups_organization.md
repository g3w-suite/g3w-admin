# Hierarchical organization of WebGis services and types of Users (roles)
This paragraph allows you to understand how G3W-SUITE makes it possible to manage the individual WebGis services in a structured and hierarchical way.

The organizational levels are two:
 * **`Cartographic MacroGroups`**
   * **`Cartographic groups`**

These organizational levels can be associated with different types of users (Editor 1, Editor2 and Viewer) in order to manage the access / management powers to the individual elements in a granular way

The example shown in the following graph is that relating to the case of a Union of Municipalities where we need to organize the various WebGis services in containers that identify the individual municipal administrations and individual services.

Access policies and individual functional modules may be associated with each WebGis service.

![](images/manual/g3wsuite_administration_organization_containers_simple.png)

## Types of Users (Roles)
The user management session allows you to create **Users** and **Users Groups** and associate them with specific roles:
 * **`Admin1`:** user with full powers **including** Django administration (basic suite configuration)
 * **`Admin2`:** user with full powers **excluding** those of Django administration (basic configuration of the suite)
 * **`Editor1`:** administrator of one or more Cartographic MacroGroups for which it will be possible:
   * create users and/or user groups
   * create Cartographic Groups and, if necessary, assign them to an Editor 2 user
   * publish WebGis services and define their access policy
   * activate and configure some functional modules
 * **`Editor2`:** administrator of one or more Cartographic Groups for which it will be possible:
   * publish/update WebGis services and define their access policy
   * activate and configure some functional modules
 * **`Viewer`:** user with access permission in consultation on WebGis services characterized by authentication. This user can also use individual functional Modules if the relative permissions have been attributed to him
 * **`Anonymus User`:** user to be associated with WebGis services and/or functional modules with free access

## Hierarchical organization of contents
The following paragraph is dedicated to better understanding the relationships between the different types of users and the different elements of the suite (MacroGroups, Map Groups, WebGis services ...).

It is important to remember that while to publish a WebGis service you must first create a Cartographic Group that contains it, the creation/management of Cartographic MacroGroups (and associated Editor 1 users) is optional.

**If the use of MacroGroups is not necessary, the use of Editor 1 users is not recommended.**

The two cases are described below.

### Absence of MacroGroups
In case it is not need use MacroGruppi, the Admin user will be the only administrator of the suite and can therefore:
 * create users (individuals and/or groups) of various types
 * create **Cartographic Groups**
 * publish **WebGis services** within the individual **Cartographic Groups**
 * activate some specific modules on individual WebGis services
 
![](images/manual/g3wsuite_administration_organization_containers_no_mg.png)


When creating a cartographic group, the Admin user can define:
 * the eventual user (individual/group) **Editor 2** to associate the Group with
 * **Viewers** users (individuals/groups) who will have access to this container

In the event that the Cartographic Group is assigned to **Editor 2** (single or group users), they will may autonomously publish/update WebGis services inside in this container. 

**Editor 2** users will also be able to define the access policies to the published WebGis services, limited to the Viewers users associated with the Cartographic Group by the Admin user.

Even the **Admin** user can publish **WebGis services** within a Cartographic Group and, if necessary, associate them with a user (single and/or group) of **Editor 2** type.

### Presence of MacroGroups
The **Macrogroups** are thematic containers dedicated to the individual superstructures of your company/public administration (e.g. Municipal Administrations of a Union of Municipalities) within which can be created Cartographic Groups dedicated to individual Services (e.g. Registry Office, Public Works, Urban Planning ...) 

Each **Thematic Group** will welcome individual WebGis services.

![](images/manual/g3wsuite_administration_organization_containers.png)

**Macrogroups** can be created only by **Admin** users.

Each **Macrogroup** can be associated with only one **Editor1** user.

Each MacroGroup can be considered as a watertight compartment within which the associated Editor 1 user (administrator in full of the MacroGroup), will be able to create users and user groups that will be made available to define access permissions for content (Groups Maps, WebGis services, functional modules ...) of the reference MacroGroup only.

In this way it will be possible to create totally independent entities, the MacroGroups, which will be managed exclusively by the user Editor 1 associated with them.

Clearly the Admin users (1 and 2) will continue to have full powers on all groups present in the system

As previously specified, **Editor 1** user will be able to:
 * create **users** (single and/or groups) of type Editor2 and Viewer
 * create **Cartographic Groups** within its **Macro Group**
 * publish **WebGis services** within his **Cartographic Groups**
 * activate **specific modules** on individual **WebGis services**

When Editor 1 user creates a Cartographic Group, he can define:
 * the eventual **Editor2** user (individual/group) to associate with this Group
 * **Viewers** users (individuals/groups) who will have access to this container

## Summary table of access/administration policies
Below is a summary table of the powers associated with the different roles.

![](images/manual/roles_table.png)

| **Role**| **Description**|  **Users**| **Cartographic MacroGroups**| **Cartographic Grups**| **WebGis Services**| **Editing**
| ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |   ----------- |  
| **Admin1**|  Advanced administrator with possibility to act on the Django Administration component| Manages Editor1, Editor2 and Viewer users| Create and manage Cartographic MacroGroups and associate them with user Editor1| Create and manage Cartographic Groups. Manages access/management permissions on the Group| Publish/manage WebGis services. Manages access/management permissions on the service| It acts on all the layers on which the editing function is activated
| **Admin2**|  Basic administrator. No Django Administration component| Manages Editor1, Editor2 and Viewer users| Create and manage Cartographic MacroGroups and associate them with user Editor1| Create and manage Cartographic Groups. Manages access/management permissions on the Group| Publish/manage WebGis services. Manages access/management permissions on the service| It acts on all the layers on which the editing function is activated
| **Editor1**|  Advanced manager user| Manages Editor2 and Viewer users. Users created by an Editor1 user cannot be managed by other Editor1 users| Manages contents of the Cartographic MacroGroup assigned to him| Creates and manages Cartographic Groups within the Cartographic MacroGroup assigned to him. Manages access/management permissions on the Group limited to users created by him| Publishes/manages WebGis services within the Cartographic Groups assigned to him. Manages access/management permissions on the service limited to users created by him| It acts on the layers on which the editing function is activated, if contained in the Cartographic MacroGroup assigned to him
| **Editor2**|  Simple user manager| - | - | Manages Cartographic Groups assigned to him| Publishes/manages WebGis services within Cartographic Groups assigned to him| It works on the layers on which the editing function is activated, if contained in the Cartographic Groups assigned to him
| **Viewer**|  Simple user manager| - | View Cartographic MacroGroups on the front end based on associated credentials | View Cartographic Groups on the front end based on the associated credentials | View WebGis services based on associated credentials | It acts on all the layers on which the editing function is activated, based on the associated credentials

