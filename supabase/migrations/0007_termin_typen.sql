-- 0007 — Termin-Typen an den echten Vertriebsablauf anpassen (Audit).
-- Ersetzt die Platzhalter-Typen aus 0002 durch die tatsächlichen Gesprächsarten.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- Alte Typ-Prüfung entfernen (Inline-CHECK aus 0002 heisst termine_typ_check).
alter table public.termine drop constraint termine_typ_check;

-- Neue Typen. Werte sind kurze, stabile Codes; die Klartext-Labels leben im
-- Frontend (kalender/types.ts, TERMIN_TYP_LABEL) und lassen sich dort ohne
-- Migration anpassen.
--   rec  = Rekrutierungsgespräch
--   vg   = Verkaufsgespräch
--   ttv  = Telefonische Terminvereinbarung
--   tv   = Termin (eigener Typ)
--   zvg  = Zielvereinbarungsgespräch
--   einarbeitung, meeting, grundkurs
alter table public.termine
  add constraint termine_typ_check
  check (typ in ('rec', 'vg', 'ttv', 'tv', 'zvg', 'einarbeitung', 'meeting', 'grundkurs'));
