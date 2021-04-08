-- SQL script to run AFTER python3 manage.py migrate on upgrade of G3W-SUITE from version 3.1.x to 3.2.x
--
-- Author: Walter Lorenzetti (lorenzetti@gis3w.it)
-- Date: 2021-04-08
--------------------------------------------------------------------------------------------------------
 
-- Into core_baselayer
UPDATE core_baselayer SET "order"="__order";
ALTER TABLE core_baselayer DROP COLUMN __order;


-- Into core_generalsuitedata
UPDATE core_generalsuitedata SET "about_description_fi"="__about_description_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN __about_description_fi;
UPDATE core_generalsuitedata SET "about_description_se"="__about_description_se";
ALTER TABLE core_generalsuitedata DROP COLUMN __about_description_se;

UPDATE core_generalsuitedata SET "about_name_fi"="__about_name_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN __about_name_fi;
UPDATE core_generalsuitedata SET "about_name_se"="__about_name_se";
ALTER TABLE core_generalsuitedata DROP COLUMN about_name_se;

UPDATE core_generalsuitedata SET "about_title_fi"="__about_title_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN about_title_fi;
UPDATE core_generalsuitedata SET "about_title_se"="__about_title_se";
ALTER TABLE core_generalsuitedata DROP COLUMN about_title_se;

UPDATE core_generalsuitedata SET "credits_fi"="__credits_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN credits_fi;
UPDATE core_generalsuitedata SET "credits_se"="__credits_se";
ALTER TABLE core_generalsuitedata DROP COLUMN credits_se;

UPDATE core_generalsuitedata SET "groups_map_description_fi"="__groups_map_description_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN groups_map_description_fi;
UPDATE core_generalsuitedata SET "groups_map_description_se"="__groups_map_description_se";
ALTER TABLE core_generalsuitedata DROP COLUMN groups_map_description_se;

UPDATE core_generalsuitedata SET "groups_title_fi"="__groups_title_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN groups_title_fi;
UPDATE core_generalsuitedata SET "groups_title_se"="__groups_title_se";
ALTER TABLE core_generalsuitedata DROP COLUMN groups_title_se;

UPDATE core_generalsuitedata SET "home_description_fi"="__home_description_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN home_description_fi;
UPDATE core_generalsuitedata SET "home_description_se"="__home_description_se";
ALTER TABLE core_generalsuitedata DROP COLUMN home_description_se;

UPDATE core_generalsuitedata SET "login_description_fi"="__login_description_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN login_description_fi;
UPDATE core_generalsuitedata SET "login_description_se"="__login_description_se";
ALTER TABLE core_generalsuitedata DROP COLUMN login_description_se;

UPDATE core_generalsuitedata SET "main_map_title_fi"="__main_map_title_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN main_map_title_fi;
UPDATE core_generalsuitedata SET "main_map_title_se"="__main_map_title_se";
ALTER TABLE core_generalsuitedata DROP COLUMN main_map_title_se;

UPDATE core_generalsuitedata SET "sub_title_fi"="__sub_title_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN sub_title_fi;
UPDATE core_generalsuitedata SET "sub_title_se"="__sub_title_se";
ALTER TABLE core_generalsuitedata DROP COLUMN sub_title_se;

UPDATE core_generalsuitedata SET "title_fi"="__title_fi";
ALTER TABLE core_generalsuitedata DROP COLUMN title_fi;
UPDATE core_generalsuitedata SET "title_se"="__title_se";
ALTER TABLE core_generalsuitedata DROP COLUMN title_se;


-- Into core_group
UPDATE core_group SET "description_fi"="__description_fi";
ALTER TABLE core_group DROP COLUMN description_fi;
UPDATE core_group SET "description_se"="__description_se";
ALTER TABLE core_group DROP COLUMN description_se;

UPDATE core_group SET "header_terms_of_use_text_fi"="__header_terms_of_use_text_fi";
ALTER TABLE core_group DROP COLUMN header_terms_of_use_text_fi;
UPDATE core_group SET "header_terms_of_use_text_se"="__header_terms_of_use_text_se";
ALTER TABLE core_group DROP COLUMN header_terms_of_use_text_se;

UPDATE core_group SET "title_fi"="__title_fi";
ALTER TABLE core_group DROP COLUMN title_fi;
UPDATE core_group SET "title_se"="__title_se";
ALTER TABLE core_group DROP COLUMN title_se;


-- Into core_macrogroup
UPDATE core_macrogroup SET "description_fi"="__description_fi";
ALTER TABLE core_macrogroup DROP COLUMN description_fi;
UPDATE core_macrogroup SET "description_se"="__description_se";
ALTER TABLE core_macrogroup DROP COLUMN description_se;

UPDATE core_macrogroup SET "title_fi"="__title_fi";
ALTER TABLE core_macrogroup DROP COLUMN title_fi;
UPDATE core_macrogroup SET "title_se"="__title_se";
ALTER TABLE core_macrogroup DROP COLUMN title_se;

-- Into qdjango_project
UPDATE qdjango_project SET "description_fi"="__description_fi";
ALTER TABLE qdjango_project DROP COLUMN description_fi;
UPDATE qdjango_project SET "description_se"="__description_se";
ALTER TABLE qdjango_project DROP COLUMN description_se;

UPDATE qdjango_project SET "title_ur_fi"="__title_ur_fi";
ALTER TABLE qdjango_project DROP COLUMN title_ur_fi;
UPDATE qdjango_project SET "title_ur_se"="__title_ur_se";
ALTER TABLE qdjango_project DROP COLUMN title_ur_se;
