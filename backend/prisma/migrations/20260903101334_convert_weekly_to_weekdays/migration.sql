-- "Wöchentlich" (WEEKLY) wird in der UI mit "Wochentage" (WEEKDAYS) zusammengelegt
-- (funktional identisch: WEEKLY ist WEEKDAYS mit genau einem, aus startDate
-- abgeleiteten Tag). Bestehende WEEKLY-Erinnerungen werden auf WEEKDAYS mit
-- diesem einen Wochentag migriert, damit sie weiterhin korrekt feuern und in
-- der (jetzt einzigen) "Wochentage"-Ansicht auftauchen.
--
-- Reine Datenmigration, kein Schema-Wechsel — der Enum-Wert WEEKLY bleibt in
-- schema.prisma bestehen (kein Risiko einer MySQL-ENUM-Verkleinerung), wird
-- von der App aber nach dieser Migration nicht mehr neu vergeben.
--
-- DAYOFWEEK() liefert 1=So..7=Sa (MySQL) — die App zählt 0=So..6=Sa
-- (JS Date.getDay()), daher -1.
UPDATE `reminders`
SET `recurrence` = 'WEEKDAYS',
    `weekdays` = JSON_ARRAY(DAYOFWEEK(`startDate`) - 1)
WHERE `recurrence` = 'WEEKLY';
