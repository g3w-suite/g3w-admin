select * from giunzione_stradale where cod_gnz like 'RT046007%' order by cod_gnz DESC limit 1;

CREATE SEQUENCE giunzione_stradale_cod_gnz_seq
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 99999
  START 13384
  CACHE 1;
COMMENT ON SEQUENCE giunzione_stradale_cod_gnz_seq
  IS 'Sequenza incrementale dei 6 numeri del cod_gnz';