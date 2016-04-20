select * from toponimo_stradale where cod_top like 'RT046007%' order by cod_top DESC limit 1;

CREATE SEQUENCE toponimo_stradale_cod_top_seq
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 99999
  START 46074
  CACHE 1;
COMMENT ON SEQUENCE toponimo_stradale_cod_top_seq
  IS 'Sequenza incrementale dei 6 numeri del cod_top';