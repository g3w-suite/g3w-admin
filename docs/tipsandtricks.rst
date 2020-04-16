***************
Tips and tricks
***************

Indication about rendering map performance and other optimization
#################################################################


Performances optimization
*************************


.. note:: Followed indications are for geo data, in particular for Postgis data, and use of they in a QGIS project.

General rules (in no particular order: they are all mandatory):

1. set scale-dependent visibility for the entire layer or for some filtered features (example: show only major roads until at scale 1:1E+6)
2. when using rule-based/categorized classification or scale-dependent visibility create indexes on the column(s) involved in the rule expression (example: "create index idx_elec_penwell_ious on elec_penwell_ious (owner);" )
3. start the project with only a few layers turned on by default
4. do not turn on by default base-layers XYZ such as (Google base maps)
5. do not use rule-based/categorized rendering on layers with too many categories (example: elec_penwell_public_power), they are unreadable anyway
6. enable redering simplification for not-point layers, set it to `Distance` `1.2` and check `Enable provider simplification if available`