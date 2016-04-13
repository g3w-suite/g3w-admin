CREATE OR REPLACE FUNCTION trig_delete_accesso()
  RETURNS trigger AS
$BODY$
DECLARE
    acctodel RECORD;
BEGIN
	IF OLD.tip_acc = '0101' THEN
		DELETE FROM numero_civico WHERE cod_acc_es = OLD.cod_acc;
	ELSIF OLD.tip_acc = '0501' THEN
		DELETE FROM numero_civico WHERE cod_acc_in = OLD.cod_acc;
	ELSIF OLD.tip_acc = '0102' THEN
	   FOR acctodel IN SELECT * FROM numero_civico WHERE cod_acc_es = OLD.cod_acc
	   LOOP
		DELETE FROM accesso WHERE cod_acc = acctodel.cod_acc_in AND tip_acc = '0501';
	   END LOOP;
	END IF;

	RETURN OLD;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
COMMENT ON FUNCTION trig_delete_accesso() IS 'Funzione di trigger che elmina gli utenti dalle tabelle connesse a accessi: numero_civico, interni';