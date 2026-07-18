-- 0006 — KI-Insights (Session 8): Handlungsempfehlungen fürs Master-Dashboard.
-- Eine Edge Function (insights-generieren) analysiert Ziel vs. Ist pro Partner
-- und schreibt hier priorisierte Empfehlungen rein.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- insights — eine Handlungsempfehlung zu einem Partner für einen Monat.
--
-- `fakt` ist die datenbasierte Beobachtung ("0 Einheiten bei Ziel 400"),
-- `empfehlung` die Handlung ("eingreifen: Termine sichern"). Die Signale
-- entstehen regelbasiert (deterministisch); die KI verfeinert optional nur die
-- Formulierung. Geschrieben wird per service_role aus der Edge Function.
-- ---------------------------------------------------------------------------
create table public.insights (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partner (id) on delete cascade,
  monat       date not null,
  typ         text not null
              check (typ in (
                'einheiten_null',
                'hinter_plan',
                'keine_termine',
                'onboarding_stockt'
              )),
  prioritaet  text not null check (prioritaet in ('hoch', 'mittel', 'niedrig')),
  fakt        text not null,
  empfehlung  text not null,
  erledigt    boolean not null default false,
  erstellt_am timestamptz not null default now(),

  constraint insights_monat_erster
    check (monat = date_trunc('month', monat::timestamp)::date)
);

-- Ein Insight-Typ pro Partner und Monat — die Generierung ersetzt (upsert),
-- statt Duplikate anzuhäufen.
create unique index insights_partner_monat_typ_uniq
  on public.insights (partner_id, monat, typ);

create index insights_offen_idx
  on public.insights (monat, prioritaet)
  where erledigt = false;

alter table public.insights enable row level security;

-- Lesen: die Führungskraft für ihre Struktur, der master für alle.
-- (Ein GP sieht seine eigenen Insights bewusst NICHT — das ist ein Coaching-
-- Werkzeug für die Führung, kein Selbstbewertungs-Feed.)
create policy insights_select_struktur on public.insights
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy insights_select_master on public.insights
  for select to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40);

-- Erledigt-Markieren darf die Führungskraft (ihre Struktur) und der master.
create policy insights_update_struktur on public.insights
  for update to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  )
  with check (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy insights_alles_master on public.insights
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- INSERT/DELETE laufen über die Edge Function mit service_role (umgeht RLS) —
-- bewusst keine Insert-Policy für normale Nutzer: Insights sind system-generiert.
