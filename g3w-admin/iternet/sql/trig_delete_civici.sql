CREATE OR REPLACE FUNCTION trig_delete_civici()
  RETURNS trigger AS
$BODY$DECLARE
    civinfofc RECORD;	
    civinfo RECORD;
BEGIN
	DELETE FROM interni WHERE cod_civ = OLD.cod_civ;
	FOR civinfofc IN SELECT count(cod_civ) as tot FROM civici_info WHERE cod_civ = OLD.cod_civ
	LOOP
		IF civinfofc.tot != 0 THEN
		FOR civinfo IN SELECT tip_opz  FROM accessi_info WHERE cod_civ = OLD.cod_civ LOOP
			IF civinfo.tip_opz = 'I' THEN
				DELETE FROM civici_info where cod_civ = OLD.cod_civ;
			ELSIF civinfo.tip_opz = 'U' THEN
				UPDATE civici_info SET tip_opz = 'D' WHERE cod_civ = OLD.cod_civ;
			END IF;
		END LOOP;
		ELSE
			INSERT INTO civici_info (cod_civ,tip_opz) VALUES (OLD.cod_civ,'D');
		END IF;
	END LOOP;
	RETURN OLD;
END;$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
COMMENT ON FUNCTION trig_delete_civici() IS 'Funziona che durante prima del delete su accessi_info aggiorna la tabella accessi_info';
