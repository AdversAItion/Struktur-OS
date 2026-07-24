-- 0009 — Akademie je Karrierestufe (Audit): ein Modul kann zusätzlich zur Rolle
-- eine Mindest-Stufe verlangen (z. B. Führungsmodule ab Stufe 2/3).
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

alter table public.akademie_module
  add column min_stufe smallint check (min_stufe between 1 and 6);

-- ---------------------------------------------------------------------------
-- SELECT-Policies erweitern: sichtbar nur, wenn Rolle UND (falls gesetzt) Stufe
-- reichen. `min_stufe is null` = keine Stufen-Anforderung (Verhalten wie bisher).
-- Der master sieht weiterhin alles über die `_alles_master`-Policies (unberührt).
-- ---------------------------------------------------------------------------
drop policy akademie_module_select_ab_min_role on public.akademie_module;
create policy akademie_module_select_ab_min_role on public.akademie_module
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= public.rolle_rang(min_role)
    and (min_stufe is null or public.meine_stufe() >= min_stufe)
  );

drop policy akademie_lektionen_select_ab_min_role on public.akademie_lektionen;
create policy akademie_lektionen_select_ab_min_role on public.akademie_lektionen
  for select to authenticated
  using (
    exists (
      select 1 from public.akademie_module m
      where m.id = modul_id
        and public.rolle_rang(public.meine_rolle()) >= public.rolle_rang(m.min_role)
        and (m.min_stufe is null or public.meine_stufe() >= m.min_stufe)
    )
  );

drop policy akademie_tests_select_ab_min_role on public.akademie_tests;
create policy akademie_tests_select_ab_min_role on public.akademie_tests
  for select to authenticated
  using (
    exists (
      select 1
      from public.akademie_lektionen l
      join public.akademie_module m on m.id = l.modul_id
      where l.id = lektion_id
        and public.rolle_rang(public.meine_rolle()) >= public.rolle_rang(m.min_role)
        and (m.min_stufe is null or public.meine_stufe() >= m.min_stufe)
    )
  );
