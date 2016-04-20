select * from elemento_stradale where cod_ele like 'RT046007%' order by cod_ele DESC limit 1;

CREATE SEQUENCE elemento_stradale_cod_ele_seq
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 99999
  START 16216
  CACHE 1;
COMMENT ON SEQUENCE elemento_stradale_cod_ele_seq
  IS 'Sequenza incrementale dei 6 numeri del cod_ele';