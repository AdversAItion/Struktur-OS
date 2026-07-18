-- 0001 — Auth-Fundament: Rollen, partner-Tabelle, RLS.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- Rollen
-- ---------------------------------------------------------------------------
create type public.rolle as enum (
  'gp_frisch',
  'gp_stufe2',
  'fuehrungskraft',
  'master'
);

-- Rang der Rolle: höher = mehr Rechte. Spiegelbild von ROLLEN_RANG
-- in src/modules/auth/types.ts — beide müssen synchron bleiben.
create or replace function public.rolle_rang(r public.rolle)
returns int
language sql
immutable
parallel safe
as $$
  select case r
    when 'master'         then 40
    when 'fuehrungskraft' then 30
    when 'gp_stufe2'      then 20
    when 'gp_frisch'      then 10
  end;
$$;

-- ---------------------------------------------------------------------------
-- partner — ein Mensch im Vertrieb, 1:1 an einen auth.users-Account gekoppelt.
-- ---------------------------------------------------------------------------
create table public.partner (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  name       text not null default '',
  email      text,
  rolle      public.rolle not null default 'gp_frisch',
  -- Karrierestufe im Ergo-Pro-System, 1..6 (Repräsentant .. Direktionsrepräsentant
  -- der Stufe 6). Unabhängig von `rolle`: die Rolle steuert Rechte in dieser App,
  -- die Stufe bildet die Vertriebs-Karriere ab. Labels: KARRIERESTUFE_LABEL
  -- in src/modules/auth/types.ts.
  stufe      smallint not null default 1 check (stufe between 1 and 6),
  -- Upline: an wen der Partner berichtet. NULL = Wurzel der Struktur.
  upline_id  uuid references public.partner (id) on delete set null,
  aktiv      boolean not null default true,
  -- Start im Vertrieb. Fachliches Datum, bewusst getrennt von created_at
  -- (dem Anlegen des Accounts) — ein Partner kann lange vor der App starten.
  aktiv_seit date not null default current_date,
  created_at timestamptz not null default now()
);

create index partner_user_id_idx on public.partner (user_id);
create index partner_upline_id_idx on public.partner (upline_id);

-- ---------------------------------------------------------------------------
-- Helfer — SECURITY DEFINER, damit die RLS-Policies auf partner nicht
-- rekursiv wieder partner-RLS auslösen (klassische Supabase-Endlosschleife).
-- ---------------------------------------------------------------------------
create or replace function public.meine_rolle()
returns public.rolle
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rolle from public.partner where user_id = auth.uid();
$$;

create or replace function public.meine_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.partner where user_id = auth.uid();
$$;

-- Gelesen aus der committeten Zeile. Dient der partner_update_eigene-Policy als
-- Ersatz für OLD: in einer UPDATE-Policy sieht `with check` nur NEW, deshalb wird
-- der Altwert hier aus der DB geholt und gegen NEW verglichen.
create or replace function public.meine_stufe()
returns smallint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select stufe from public.partner where user_id = auth.uid();
$$;

create or replace function public.meine_upline_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select upline_id from public.partner where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Neuer Account -> automatisch partner-Zeile. Startrolle immer gp_frisch;
-- Hochstufen macht ausschliesslich ein master.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.partner (user_id, name, email, rolle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    'gp_frisch'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.partner enable row level security;

-- Jeder sieht die eigene Zeile.
create policy partner_select_eigene on public.partner
  for select to authenticated
  using (user_id = auth.uid());

-- Master sieht alle.
create policy partner_select_master on public.partner
  for select to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40);

-- Eigene Stammdaten ändern (name, email) — aber nie Rolle, Karrierestufe oder
-- Upline. Sonst könnte sich jeder selbst hochstufen oder in eine fremde
-- Struktur hängen. Diese drei Felder setzt ausschliesslich ein master.
create policy partner_update_eigene on public.partner
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and rolle = public.meine_rolle()
    and stufe = public.meine_stufe()
    and upline_id is not distinct from public.meine_upline_id()
  );

-- Master darf alles ändern (inkl. Rolle und Upline).
create policy partner_update_master on public.partner
  for update to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- INSERT läuft nur über den Trigger, DELETE nur über auth.users-Kaskade.
-- Deshalb bewusst keine insert/delete-Policy.

-- ---------------------------------------------------------------------------
-- "fuehrungskraft sieht ihre Struktur" kommt in 0002 nach: geklärt ist, dass
-- das die gesamte rekursive Downline meint (ganze upline_id-Kette), nicht nur
-- die direkte Ebene.
-- ---------------------------------------------------------------------------
