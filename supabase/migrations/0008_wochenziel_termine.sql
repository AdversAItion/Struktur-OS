-- 0008 — Wochenziel Termine je Partner (Audit): Pflicht-Aufgaben individuell,
-- Referenz 5 Termine/Woche. Setzt der master pro GP.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

alter table public.partner
  add column wochenziel_termine smallint not null default 5
  check (wochenziel_termine >= 0);

-- Helfer wie meine_stufe(): liefert den Altwert aus der committeten Zeile,
-- damit die Update-Policy „Feld darf sich nicht selbst ändern" prüfen kann.
create or replace function public.mein_wochenziel_termine()
returns smallint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select wochenziel_termine from public.partner where user_id = auth.uid();
$$;

-- partner_update_eigene neu: der Partner darf seine Stammdaten ändern, aber
-- weder Rolle, Stufe, Upline NOCH das Wochenziel — das setzt nur der master.
drop policy partner_update_eigene on public.partner;

create policy partner_update_eigene on public.partner
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and rolle = public.meine_rolle()
    and stufe = public.meine_stufe()
    and upline_id is not distinct from public.meine_upline_id()
    and wochenziel_termine = public.mein_wochenziel_termine()
  );
