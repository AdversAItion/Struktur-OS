-- 0003 — Akademie: Module, Lektionen, Tests, Fortschritt.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- akademie_module — die Kapitel der Onboarding-Akademie.
--
-- `min_role` ist die Freischaltung: ein Modul ist sichtbar, sobald die eigene
-- Rolle mindestens diesen Rang hat. Damit hängt die Akademie an derselben
-- Rollen-Mechanik wie der Rest der App (rolle_rang aus 0001).
-- ---------------------------------------------------------------------------
create type public.akademie_kategorie as enum (
  'ergo_basics',
  'produkte',
  'karriere',
  'verkauf',
  'anmeldung',
  'stufe2'
);

create table public.akademie_module (
  id           uuid primary key default gen_random_uuid(),
  titel        text not null check (length(trim(titel)) > 0),
  beschreibung text,
  min_role     public.rolle not null default 'gp_frisch',
  reihenfolge  integer not null default 0,
  kategorie    public.akademie_kategorie not null,
  created_at   timestamptz not null default now()
);

create index akademie_module_reihenfolge_idx
  on public.akademie_module (kategorie, reihenfolge);

-- ---------------------------------------------------------------------------
-- akademie_lektionen — einzelne Lerneinheit in einem Modul.
-- Video liegt als unlisted YouTube-Link in video_url, Text als Markdown.
-- ---------------------------------------------------------------------------
create table public.akademie_lektionen (
  id              uuid primary key default gen_random_uuid(),
  modul_id        uuid not null references public.akademie_module (id) on delete cascade,
  titel           text not null check (length(trim(titel)) > 0),
  video_url       text,
  inhalt_markdown text,
  reihenfolge     integer not null default 0,
  created_at      timestamptz not null default now()
);

create index akademie_lektionen_modul_idx
  on public.akademie_lektionen (modul_id, reihenfolge);

-- ---------------------------------------------------------------------------
-- akademie_tests — Verständnisfrage zu einer Lektion.
--
-- `antworten` ist ein JSON-Array von Strings, `richtige_antwort` der Index
-- darin (0-basiert). Der CHECK erzwingt beides, damit kein Test mit einem
-- Index ins Leere zeigen kann.
-- ---------------------------------------------------------------------------

-- Ausgelagert, weil ein CHECK-Constraint keine Subquery enthalten darf
-- (Postgres: "cannot use subquery in check constraint"). Das Prüfen jedes
-- Array-Elements braucht aber eine — also steckt sie in dieser immutable
-- Funktion, die der CHECK aufrufen darf.
create or replace function public.ist_string_array(daten jsonb)
returns boolean
language sql
immutable
parallel safe
as $$
  select jsonb_typeof(daten) = 'array'
     and not exists (
       select 1 from jsonb_array_elements(daten) a
       where jsonb_typeof(a) <> 'string'
     );
$$;

create table public.akademie_tests (
  id               uuid primary key default gen_random_uuid(),
  lektion_id       uuid not null references public.akademie_lektionen (id) on delete cascade,
  frage            text not null check (length(trim(frage)) > 0),
  antworten        jsonb not null,
  richtige_antwort smallint not null,
  created_at       timestamptz not null default now(),

  -- Mindestens zwei Auswahlmöglichkeiten, alle davon Strings.
  constraint akademie_tests_antworten_array check (
    public.ist_string_array(antworten)
    and jsonb_array_length(antworten) >= 2
  ),
  -- Der Index muss in das Array zeigen.
  constraint akademie_tests_index_gueltig check (
    richtige_antwort >= 0
    and richtige_antwort < jsonb_array_length(antworten)
  )
);

create index akademie_tests_lektion_idx on public.akademie_tests (lektion_id);

-- ---------------------------------------------------------------------------
-- akademie_fortschritt — wer welche Lektion abgeschlossen hat.
-- Eine Zeile pro Partner und Lektion.
-- ---------------------------------------------------------------------------
create table public.akademie_fortschritt (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.partner (id) on delete cascade,
  lektion_id      uuid not null references public.akademie_lektionen (id) on delete cascade,
  abgeschlossen_am timestamptz,
  test_bestanden  boolean not null default false,
  created_at      timestamptz not null default now(),

  constraint akademie_fortschritt_partner_lektion_uniq unique (partner_id, lektion_id)
);

create index akademie_fortschritt_partner_idx
  on public.akademie_fortschritt (partner_id);

-- ---------------------------------------------------------------------------
-- RLS — Inhalte
--
-- Module und Lektionen sind Lesestoff für alle, die weit genug sind:
-- sichtbar ab min_role. Gepflegt werden sie ausschliesslich vom master.
-- ---------------------------------------------------------------------------
alter table public.akademie_module enable row level security;

create policy akademie_module_select_ab_min_role on public.akademie_module
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= public.rolle_rang(min_role)
  );

create policy akademie_module_alles_master on public.akademie_module
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

alter table public.akademie_lektionen enable row level security;

-- Eine Lektion erbt die Freischaltung ihres Moduls.
create policy akademie_lektionen_select_ab_min_role on public.akademie_lektionen
  for select to authenticated
  using (
    exists (
      select 1 from public.akademie_module m
      where m.id = modul_id
        and public.rolle_rang(public.meine_rolle()) >= public.rolle_rang(m.min_role)
    )
  );

create policy akademie_lektionen_alles_master on public.akademie_lektionen
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

alter table public.akademie_tests enable row level security;

-- Test erbt die Freischaltung über Lektion -> Modul.
--
-- Achtung: `richtige_antwort` ist hier mitlesbar. Wer die Netzwerk-Antwort
-- anschaut, sieht die Lösung. Für eine interne Lern-Akademie ist das bewusst
-- in Ordnung — Auswertung serverseitig zu verstecken wäre eine Edge Function
-- und lohnt erst, wenn Tests prüfungsrelevant werden.
create policy akademie_tests_select_ab_min_role on public.akademie_tests
  for select to authenticated
  using (
    exists (
      select 1
      from public.akademie_lektionen l
      join public.akademie_module m on m.id = l.modul_id
      where l.id = lektion_id
        and public.rolle_rang(public.meine_rolle()) >= public.rolle_rang(m.min_role)
    )
  );

create policy akademie_tests_alles_master on public.akademie_tests
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- ---------------------------------------------------------------------------
-- RLS — Fortschritt: eigener Fortschritt ist Selbstbedienung,
-- die Struktur liest mit, der master darf alles.
-- ---------------------------------------------------------------------------
alter table public.akademie_fortschritt enable row level security;

create policy akademie_fortschritt_select_eigene on public.akademie_fortschritt
  for select to authenticated
  using (partner_id = public.meine_partner_id());

create policy akademie_fortschritt_select_struktur on public.akademie_fortschritt
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy akademie_fortschritt_insert_eigene on public.akademie_fortschritt
  for insert to authenticated
  with check (partner_id = public.meine_partner_id());

create policy akademie_fortschritt_update_eigene on public.akademie_fortschritt
  for update to authenticated
  using (partner_id = public.meine_partner_id())
  with check (partner_id = public.meine_partner_id());

create policy akademie_fortschritt_alles_master on public.akademie_fortschritt
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);
