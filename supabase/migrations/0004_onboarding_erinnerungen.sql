-- 0004 — Automatische Onboarding-Erinnerungen (Session 6).
-- Basis für die Edge Function `onboarding-erinnerungen` (täglicher Cron):
-- fällige onboarding_trigger -> Resend-Mail mit Tutorial-Link.
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- Idempotenz: wann die Erinnerung zu diesem Trigger verschickt wurde.
-- Der Cron sendet nur, wenn das NULL ist — so geht keine Mail doppelt raus,
-- auch wenn der Job mehrmals am Tag läuft.
-- ---------------------------------------------------------------------------
alter table public.onboarding_trigger
  add column erinnerung_gesendet_am timestamptz;

-- Index für die Cron-Abfrage: offene, noch nicht erinnerte, fällige Trigger.
create index onboarding_trigger_faellig_idx
  on public.onboarding_trigger (aktion_faellig_am)
  where aktion_erledigt = false and erinnerung_gesendet_am is null;

-- ---------------------------------------------------------------------------
-- onboarding_vorlagen — E-Mail-Vorlage je trigger_typ.
--
-- Trennt Inhalt (Betreff, Text, Tutorial-Link) vom Code der Edge Function, damit
-- der Master Texte/Links ohne Deploy pflegen kann. Der Cron sendet NUR, wenn
-- `aktiv = true` UND `tutorial_url` gesetzt ist — Platzhalter lösen also nie
-- einen Versand aus.
-- ---------------------------------------------------------------------------
create table public.onboarding_vorlagen (
  -- 1:1 zu den trigger_typ-Werten aus 0002. Gleiche CHECK-Liste, damit keine
  -- Vorlage für einen unbekannten Typ entsteht.
  trigger_typ  text primary key
               check (trigger_typ in (
                 'fuehrungszeugnis_abgegeben',
                 'ihk_angemeldet',
                 'vertrag_unterschrieben',
                 'erstgespraech_gefuehrt'
               )),
  betreff      text not null,
  -- Reiner Text/Markdown des Mail-Bodys. `{{name}}` wird von der Function durch
  -- den Vornamen des Partners ersetzt.
  inhalt       text not null,
  tutorial_url text,
  aktiv        boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.onboarding_vorlagen enable row level security;

-- Nur der master pflegt Vorlagen. Die Edge Function nutzt den service_role-Key
-- und umgeht RLS ohnehin — diese Policy ist für die (spätere) Master-UI.
create policy onboarding_vorlagen_alles_master on public.onboarding_vorlagen
  for all to authenticated
  using (public.rolle_rang(public.meine_rolle()) >= 40)
  with check (public.rolle_rang(public.meine_rolle()) >= 40);

-- ---------------------------------------------------------------------------
-- ENTWURF-Platzhalter: je ein inaktiver Vorlagen-Slot pro trigger_typ, damit
-- der Master im Audit nur noch echten Text + Tutorial-Link einträgt und aktiv
-- schaltet. `aktiv = false` und `tutorial_url = NULL` => es sendet nichts.
-- [OFFEN: echte Betreffzeilen, Texte und Tutorial-Links kommen vom Vertrieb.]
-- ---------------------------------------------------------------------------
insert into public.onboarding_vorlagen (trigger_typ, betreff, inhalt, tutorial_url, aktiv)
values
  ('fuehrungszeugnis_abgegeben',
   '[ENTWURF] Nächster Schritt nach dem Führungszeugnis',
   E'Hi {{name}},\n\n[ENTWURF: echten Text ergänzen — z. B. Anleitung zu den Onlineverträgen.]',
   null, false),
  ('ihk_angemeldet',
   '[ENTWURF] Deine IHK-Anmeldung',
   E'Hi {{name}},\n\n[ENTWURF: echten Text ergänzen.]',
   null, false),
  ('vertrag_unterschrieben',
   '[ENTWURF] Willkommen — so geht es weiter',
   E'Hi {{name}},\n\n[ENTWURF: echten Text ergänzen.]',
   null, false),
  ('erstgespraech_gefuehrt',
   '[ENTWURF] Nach deinem Erstgespräch',
   E'Hi {{name}},\n\n[ENTWURF: echten Text ergänzen.]',
   null, false)
on conflict (trigger_typ) do nothing;
