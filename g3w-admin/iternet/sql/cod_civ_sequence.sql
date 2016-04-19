select * from numero_civico where cod_acc like 'RT046007%' order by cod_civ DESC limit 1;

CREATE SEQUENCE numero_civico_cod_civ_seq
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 999999
  START 38101
  CACHE 1;
COMMENT ON SEQUENCE numero_civico_cod_civ_seq
  IS 'Sequenza di incremento dei 6 numeri cod_civ della tabella numero_civico';