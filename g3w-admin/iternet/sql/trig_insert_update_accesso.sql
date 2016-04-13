CREATE OR REPLACE FUNCTION trig_insert_update_accesso()
  RETURNS trigger AS
$BODY$DECLARE
    civinfofc RECORD;
BEGIN
	IF TG_OP = 'INSERT' THEN
		INSERT INTO accessi_info (cod_civ,tip_opz) VALUES (NEW.cod_civ,'I');
	ELSE
		FOR civinfofc IN SELECT count(cod_civ) as tot FROM accessi_info WHERE cod_civ = NEW.cod_civ AND tip_opz = 'I' LOOP
			IF civinfofc.tot = 0 THEN
				INSERT INTO accessi_info (cod_civ,tip_opz) VALUES (NEW.cod_civ,'U');
			END IF;
		END LOOP;
	END IF;
	RETURN NEW;
END;$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
COMMENT ON FUNCTION trig_insert_update_accesso() IS 'Trigger sull''insert delle tabella civici per accessi_info';