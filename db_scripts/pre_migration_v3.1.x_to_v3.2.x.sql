-- SQL script to run BEFORE python3 manage.py migrate on upgrade of G3W-SUITE from version 3.1.x to 3.2.x
--
-- Author: Walter Lorenzetti (lorenzetti@gis3w.it)
-- Date: 2021-04-08
--------------------------------------------------------------------------------------------------------

-- Into core_baselayer
ALTER TABLE core_baselayer RENAME COLUMN "order" TO "__order";
DROP INDEX core_baselayer_order_ffe4069b;


-- Into core_generalsuitedata
ALTER TABLE core_generalsuitedata RENAME COLUMN about_description_fi TO __about_description_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN about_description_se TO __about_description_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN about_name_fi TO __about_name_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN about_name_se TO __about_name_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN about_title_fi TO __about_title_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN about_title_se TO __about_title_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN credits_fi TO __credits_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN credits_se TO __credits_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN groups_map_description_fi TO __groups_map_description_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN groups_map_description_se TO __groups_map_description_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN groups_title_fi TO __groups_title_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN groups_title_se TO __groups_title_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN home_description_fi TO __home_description_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN home_description_se TO __home_description_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN login_description_fi TO __login_description_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN login_description_se TO __login_description_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN main_map_title_fi TO __main_map_title_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN main_map_title_se TO __main_map_title_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN sub_title_fi TO __sub_title_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN sub_title_se TO __sub_title_se;
ALTER TABLE core_generalsuitedata RENAME COLUMN title_fi TO __title_fi;
ALTER TABLE core_generalsuitedata RENAME COLUMN title_se TO __title_se;


-- Into core_group
ALTER TABLE core_group RENAME COLUMN description_fi TO __description_fi;
ALTER TABLE core_group RENAME COLUMN description_se TO __description_se;
ALTER TABLE core_group RENAME COLUMN header_terms_of_use_text_fi TO __header_terms_of_use_text_fi;
ALTER TABLE core_group RENAME COLUMN header_terms_of_use_text_se TO __header_terms_of_use_text_se;
ALTER TABLE core_group RENAME COLUMN title_fi TO __title_fi;
ALTER TABLE core_group RENAME COLUMN title_se TO __title_se;


-- Into core_macrogroup
ALTER TABLE core_macrogroup RENAME COLUMN description_fi TO __description_fi;
ALTER TABLE core_macrogroup RENAME COLUMN description_se TO __description_se;
ALTER TABLE core_macrogroup RENAME COLUMN title_fi TO __title_fi;
ALTER TABLE core_macrogroup RENAME COLUMN title_se TO __title_se;


-- Into qdjango_project
ALTER TABLE qdjango_project RENAME COLUMN description_fi TO __description_fi;
ALTER TABLE qdjango_project RENAME COLUMN description_se TO __description_se;
ALTER TABLE qdjango_project RENAME COLUMN title_ur_fi TO __title_ur_fi;
ALTER TABLE qdjango_project RENAME COLUMN title_ur_se TO __title_ur_se;
