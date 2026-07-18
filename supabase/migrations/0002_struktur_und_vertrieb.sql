-- 0002 — Struktur-Sichtbarkeit (rekursiv) + Vertriebsdaten:
-- ziele, einheiten, termine, todos, onboarding_trigger.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- Struktur-Sichtbarkeit
--
-- Eine Führungskraft sieht jeden Partner, dessen upline_id-Kette zu ihr führt —
-- die gesamte rekursive Downline, nicht nur die direkte Ebene.
--
-- SECURITY DEFINER, weil die Funktion partner liest und selbst aus
-- partner-Policies heraus aufgerufen wird: ohne DEFINER würde die RLS auf
-- partner rekursiv erneut greifen (dieselbe Endlosschleife, die meine_rolle()
-- in 0001 vermeidet).
-- ---------------------------------------------------------------------------
create or replace function public.ist_in_meiner_struktur(ziel_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with recursive kette as (
    -- Start: der zu prüfende Partner.
    select id, upline_id, 1 as tiefe
    from public.partner
    where id = ziel_partner_id

    union all

    -- Schritt: eine Ebene nach oben zur jeweiligen Upline.
    -- `tiefe < 50` ist die Zyklus-Bremse: setzt jemand versehentlich einen
    -- Ring in die upline_id-Kette (A -> B -> A), liefe die Rekursion sonst
    -- endlos und würde jede Abfrage auf partner blockieren. Eine echte
    -- Struktur wird nie 50 Ebenen tief.
    select p.id, p.upline_id, k.tiefe + 1
    from public.partner p
    join kette k on p.id = k.upline_id
    where k.tiefe < 50
  )
  -- Trifft die Kette irgendwo den angemeldeten Partner, liegt das Ziel
  -- unter ihm. Der Startknoten selbst wird ausgeschlossen: "eigene Daten"
  -- regeln die jeweiligen _eigene-Policies, nicht diese Funktion.
  select exists (
    select 1 from kette
    where kette.id = public.meine_partner_id()
      and kette.id <> ziel_partner_id
  );
$$;

-- Führungskraft (Rang >= 30) sieht die Stammdaten ihrer gesamten Downline.
create policy partner_select_struktur on public.partner
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(id)
  );

-- ---------------------------------------------------------------------------
-- Wiederkehrende Policy-Bausteine
--
--   eigene Zeile      : partner_id = public.meine_partner_id()
--   Struktur (lesend) : Rang >= 30 and ist_in_meiner_struktur(partner_id)
--   master            : Rang >= 40
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ziele — was ein Partner sich für einen Monat vornimmt.
-- Entsteht im Face-to-Face-Gespräch mit der Führungskraft; `notiz` hält fest,
-- was dort besprochen wurde.
-- ---------------------------------------------------------------------------
create table public.ziele (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid not null references public.partner (id) on delete cascade,
  -- Immer auf den Monatsersten normiert (siehe ziele_monat_erster).
  -- Ein Ziel gilt für einen Kalendermonat, nie für einen einzelnen Tag.
  monat               date not null,
  ziel_einheiten      numeric(6, 2) not null default 0 check (ziel_einheiten >= 0),
  ziel_termine        integer not null default 0 check (ziel_termine >= 0),
  ziel_neuanmeldungen integer not null default 0 check (ziel_neuanmeldungen >= 0),
  notiz               text,
  -- Wer das Ziel eingetragen hat (i.d.R. die Führungskraft im Gespräch).
  erstellt_von        uuid references public.partner (id) on delete set null,
  created_at          timestamptz not null default now(),

  -- Cast nach timestamp ist Absicht: date_trunc(text, timestamptz) ist nur
  -- stable (hängt an der Zeitzone) und wäre in einem CHECK nicht erlaubt.
  constraint ziele_monat_erster
    check (monat = date_trunc('month', monat::timestamp)::date),
  -- Ein Ziel pro Partner und Monat.
  constraint ziele_partner_monat_uniq unique (partner_id, monat)
);

create index ziele_partner_monat_idx on public.ziele (partner_id, monat desc);

alter table public.ziele enable row level security;

create policy ziele_select_eigene on public.ziele
  for select to authenticated
  using (partner_id = public.meine_partner_id());

create policy ziele_select_struktur on public.ziele
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy ziele_select_master on public.ziele
  for select to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40);

-- Ziele schreibt der Partner selbst ...
create policy ziele_insert_eigene on public.ziele
  for insert to authenticated
  with check (partner_id = public.meine_partner_id());

create policy ziele_update_eigene on public.ziele
  for update to authenticated
  using (partner_id = public.meine_partner_id())
  with check (partner_id = public.meine_partner_id());

create policy ziele_delete_eigene on public.ziele
  for delete to authenticated
  using (partner_id = public.meine_partner_id());

-- ... oder der master für jeden.
create policy ziele_alles_master on public.ziele
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- ---------------------------------------------------------------------------
-- einheiten — die Vertriebs-Kennzahl. Dezimal, weil Teil-Einheiten vorkommen.
-- Erfassung läuft laut Vorgabe manuell durch den master.
-- ---------------------------------------------------------------------------
create table public.einheiten (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partner (id) on delete cascade,
  datum       date not null default current_date,
  anzahl      numeric(6, 2) not null check (anzahl >= 0),
  -- Aktuell erfasst nur der master von Hand. `quelle` ist jetzt schon da,
  -- damit ein späterer Import keine Migration der Bestandsdaten braucht.
  quelle      text not null default 'manuell'
              check (quelle in ('manuell', 'import')),
  erfasst_von uuid references public.partner (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index einheiten_partner_datum_idx on public.einheiten (partner_id, datum desc);

alter table public.einheiten enable row level security;

-- Jeder sieht die eigenen Einheiten, schreiben darf sie nur der master.
create policy einheiten_select_eigene on public.einheiten
  for select to authenticated
  using (partner_id = public.meine_partner_id());

create policy einheiten_select_struktur on public.einheiten
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy einheiten_alles_master on public.einheiten
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- ---------------------------------------------------------------------------
-- termine — Kalendereinträge eines Partners.
--
-- typ und status sind text + CHECK statt enum: die Werte werden sich mit dem
-- Vertrieb noch ändern, und eine CHECK-Erweiterung ist eine harmlose Migration,
-- während ein enum-Umbau (Wert entfernen/umbenennen) deutlich teurer ist.
-- ---------------------------------------------------------------------------
create table public.termine (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner (id) on delete cascade,
  datum      timestamptz not null,
  typ        text not null
             check (typ in ('beratung', 'nachfassen', 'rekrutierung', 'sonstiges')),
  status     text not null default 'geplant'
             check (status in ('geplant', 'stattgefunden', 'abgesagt', 'verschoben')),
  created_at timestamptz not null default now()
);

create index termine_partner_datum_idx on public.termine (partner_id, datum desc);

alter table public.termine enable row level security;

create policy termine_select_eigene on public.termine
  for select to authenticated
  using (partner_id = public.meine_partner_id());

create policy termine_select_struktur on public.termine
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy termine_insert_eigene on public.termine
  for insert to authenticated
  with check (partner_id = public.meine_partner_id());

create policy termine_update_eigene on public.termine
  for update to authenticated
  using (partner_id = public.meine_partner_id())
  with check (partner_id = public.meine_partner_id());

create policy termine_delete_eigene on public.termine
  for delete to authenticated
  using (partner_id = public.meine_partner_id());

create policy termine_alles_master on public.termine
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- ---------------------------------------------------------------------------
-- todos — Aufgaben eines Partners.
-- `quelle` sagt, wer die Aufgabe erzeugt hat: er selbst, seine Führungskraft
-- oder ein automatischer Workflow (siehe onboarding_trigger).
-- ---------------------------------------------------------------------------
create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partner (id) on delete cascade,
  titel        text not null check (length(trim(titel)) > 0),
  faellig_am   date,
  erledigt     boolean not null default false,
  quelle       text not null default 'selbst'
               check (quelle in ('selbst', 'vorgesetzter', 'system')),
  erstellt_von uuid references public.partner (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index todos_partner_offen_idx on public.todos (partner_id, erledigt, faellig_am);

alter table public.todos enable row level security;

create policy todos_select_eigene on public.todos
  for select to authenticated
  using (partner_id = public.meine_partner_id());

create policy todos_select_struktur on public.todos
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy todos_insert_eigene on public.todos
  for insert to authenticated
  with check (partner_id = public.meine_partner_id());

-- Eine Führungskraft darf ihrer Downline Aufgaben geben.
create policy todos_insert_struktur on public.todos
  for insert to authenticated
  with check (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy todos_update_eigene on public.todos
  for update to authenticated
  using (partner_id = public.meine_partner_id())
  with check (partner_id = public.meine_partner_id());

create policy todos_delete_eigene on public.todos
  for delete to authenticated
  using (partner_id = public.meine_partner_id());

create policy todos_alles_master on public.todos
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- ---------------------------------------------------------------------------
-- onboarding_trigger — Basis für die späteren automatischen Erinnerungen.
--
-- Ein Ereignis im Onboarding (z. B. Führungszeugnis abgegeben) wird hier
-- protokolliert und bekommt eine fällige Folgeaktion. Ein späterer Job liest
-- offene, fällige Zeilen und erzeugt daraus todos (quelle = 'system') bzw.
-- E-Mails über Resend. Die Automatik selbst ist noch nicht gebaut.
-- ---------------------------------------------------------------------------
create table public.onboarding_trigger (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references public.partner (id) on delete cascade,
  -- Freitext mit CHECK: die Liste wächst, sobald die Onboarding-Strecke steht.
  trigger_typ       text not null
                    check (trigger_typ in (
                      'fuehrungszeugnis_abgegeben',
                      'ihk_angemeldet',
                      'vertrag_unterschrieben',
                      'erstgespraech_gefuehrt'
                    )),
  ausgeloest_am     timestamptz not null default now(),
  aktion_faellig_am date,
  aktion_erledigt   boolean not null default false,
  created_at        timestamptz not null default now()
);

create index onboarding_trigger_offen_idx
  on public.onboarding_trigger (aktion_erledigt, aktion_faellig_am)
  where aktion_erledigt = false;

alter table public.onboarding_trigger enable row level security;

-- Lesen darf der Partner selbst und seine Struktur; pflegen nur master
-- (die Trigger sind Verwaltungsvorgänge, kein Selbstbedienungs-Feld).
create policy onboarding_trigger_select_eigene on public.onboarding_trigger
  for select to authenticated
  using (partner_id = public.meine_partner_id());

create policy onboarding_trigger_select_struktur on public.onboarding_trigger
  for select to authenticated
  using (
    public.rolle_rang(public.meine_rolle()) >= 30
    and public.ist_in_meiner_struktur(partner_id)
  );

create policy onboarding_trigger_alles_master on public.onboarding_trigger
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);
