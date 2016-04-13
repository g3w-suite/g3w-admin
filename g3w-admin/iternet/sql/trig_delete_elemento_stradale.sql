CREATE OR REPLACE FUNCTION trig_delete_elemento_stradale()
  RETURNS trigger AS
$BODY$DECLARE
    arcremain RECORD;
BEGIN
	FOR arcremain IN SELECT count(cod_ele) as tot FROM archi WHERE cod_top = OLD.cod_top LOOP
		IF arcremain.tot = 1 THEN
			DELETE FROM toponimo_stradale where cod_top = OLD.cod_top;
		END IF;
	END LOOP;
	RETURN OLD;
END;$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
COMMENT ON FUNCTION trig_delete_elemento_stradale() IS 'Funzione di trigger che elimina anche i toponimi se l''arco eliminato è l''ultimo in tabella';