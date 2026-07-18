-- 0005 — Namensliste (Session 7): die Kontaktliste, die ein GP im geführten
-- KI-Interview aufbaut. Kontakte mit ABC-Kategorie.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- kontakte — ein Mensch aus dem Umfeld eines Partners.
--
-- ABC-Kategorie ist die Kern-Priorisierung: A = warm/naheliegend,
-- B = mittel, C = eher lose. Das KI-Interview (Edge Function
-- namensliste-interview) hilft beim Sammeln; gespeichert wird hier.
-- ---------------------------------------------------------------------------
create table public.kontakte (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partner (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  kategorie   text not null default 'B' check (kategorie in ('A', 'B', 'C')),
  -- Woher man sich kennt (Familie, Arbeit, Sport ...). Freitext, optional.
  beziehung   text,
  telefon     text,
  notiz       text,
  -- Einfacher Bearbeitungsstand. Bewusst schlank gehalten; die feinere
  -- Vertriebs-Pipeline (Termin, Abschluss ...) ist noch offene Vertriebslogik.
  status      text not null default 'offen'
              check (status in ('offen', 'kontaktiert')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index kontakte_partner_kategorie_idx on public.kontakte (partner_id, kategorie);

alter table public.kontakte enable row level security;

-- Jeder verwaltet seine eigene Namensliste ...
create policy kontakte_select_eigene on public.kontakte
  for select to authenticated
  using (partner_id = public.meine_partner_id());

-- ... die Struktur (Rang >= 30) liest mit (Coaching: "Namensliste voll?") ...
create policy kontakte_select_struktur on public.kontakte
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy kontakte_insert_eigene on public.kontakte
  for insert to authenticated
  with check (partner_id = public.meine_partner_id());

create policy kontakte_update_eigene on public.kontakte
  for update to authenticated
  using (partner_id = public.meine_partner_id())
  with check (partner_id = public.meine_partner_id());

create policy kontakte_delete_eigene on public.kontakte
  for delete to authenticated
  using (partner_id = public.meine_partner_id());

-- ... und der master darf alles.
create policy kontakte_alles_master on public.kontakte
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);
