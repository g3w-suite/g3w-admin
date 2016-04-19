select * from accesso where cod_acc like 'RT046007%' order by cod_acc DESC limit 1;

CREATE SEQUENCE accesso_cod_acc_seq
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 999999
  START 38101
  CACHE 1;
COMMENT ON SEQUENCE accesso_cod_acc_seq
  IS 'Sequenza incrementale dei 6 numeri del cod_acc';