-- Seed-Daten für lokale Entwicklung und Demo.
-- Nur mit `supabase db reset` gegen die LOKALE Datenbank laufen lassen.
-- NIEMALS gegen Produktion.
--
-- Passwort für alle Demo-Accounts: struktur-demo-2026

-- Accounts anlegen. Der Trigger on_auth_user_created (0001) erzeugt daraus
-- automatisch die passenden partner-Zeilen mit Rolle gp_frisch.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'master@struktur.test',
   crypt('struktur-demo-2026', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Mara Demo"}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'fk@struktur.test',
   crypt('struktur-demo-2026', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Finn Demo"}'),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'gp2@struktur.test',
   crypt('struktur-demo-2026', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Gina Demo"}'),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
   'authenticated', 'authenticated', 'gp@struktur.test',
   crypt('struktur-demo-2026', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Jonas Demo"}')
on conflict (id) do nothing;

-- Rollen, Karrierestufen und Struktur verdrahten:
-- Mara (master) -> Finn (FK) -> Gina, Jonas.
-- Die Kette Mara -> Finn -> Gina ist zweistufig und damit der Testfall für
-- ist_in_meiner_struktur() (0002): Mara muss Gina sehen, obwohl Gina nicht
-- direkt unter ihr hängt.
update public.partner set rolle = 'master', stufe = 6,
  aktiv_seit = current_date - interval '8 years'
  where user_id = '11111111-1111-1111-1111-111111111111';

update public.partner set rolle = 'fuehrungskraft', stufe = 4,
  aktiv_seit = current_date - interval '3 years',
  upline_id = (select id from public.partner
               where user_id = '11111111-1111-1111-1111-111111111111')
  where user_id = '22222222-2222-2222-2222-222222222222';

update public.partner set rolle = 'gp_stufe2', stufe = 2,
  aktiv_seit = current_date - interval '10 months',
  upline_id = (select id from public.partner
               where user_id = '22222222-2222-2222-2222-222222222222')
  where user_id = '33333333-3333-3333-3333-333333333333';

update public.partner set stufe = 1,
  aktiv_seit = current_date - interval '3 weeks',
  upline_id = (select id from public.partner
               where user_id = '22222222-2222-2222-2222-222222222222')
  where user_id = '44444444-4444-4444-4444-444444444444';

-- ---------------------------------------------------------------------------
-- Vertriebsdaten für Gina und Jonas im laufenden Monat.
-- Die Zahlen sind frei erfunden und dienen nur dazu, dass die Views nicht
-- leer sind — sie bilden keine echten Vertriebswerte ab.
-- ---------------------------------------------------------------------------
insert into public.ziele (partner_id, monat, ziel_einheiten, ziel_termine,
                          ziel_neuanmeldungen, notiz, erstellt_von)
select
  p.id,
  date_trunc('month', current_date)::date,
  z.ziel_einheiten, z.ziel_termine, z.ziel_neuanmeldungen, z.notiz,
  (select id from public.partner where user_id = '22222222-2222-2222-2222-222222222222')
from (values
  ('33333333-3333-3333-3333-333333333333'::uuid, 12.00, 20, 2,
   'Demo-Notiz: Fokus auf Bestandskunden, Termine früher am Tag legen.'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 4.00, 12, 1,
   'Demo-Notiz: erst Namensliste fertig machen, dann Termine.')
) as z(user_id, ziel_einheiten, ziel_termine, ziel_neuanmeldungen, notiz)
join public.partner p on p.user_id = z.user_id
on conflict (partner_id, monat) do nothing;

insert into public.einheiten (partner_id, datum, anzahl, quelle, erfasst_von)
select
  p.id,
  current_date - e.tage,
  e.anzahl,
  'manuell',
  (select id from public.partner where user_id = '11111111-1111-1111-1111-111111111111')
from (values
  ('33333333-3333-3333-3333-333333333333'::uuid, 6, 2.50),
  ('33333333-3333-3333-3333-333333333333'::uuid, 3, 1.75),
  ('44444444-4444-4444-4444-444444444444'::uuid, 4, 1.00)
) as e(user_id, tage, anzahl)
join public.partner p on p.user_id = e.user_id;

insert into public.termine (partner_id, datum, typ, status)
select p.id, now() + (t.tage || ' days')::interval, t.typ, t.status
from (values
  ('33333333-3333-3333-3333-333333333333'::uuid, 2, 'beratung', 'geplant'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 1, 'rekrutierung', 'geplant'),
  ('44444444-4444-4444-4444-444444444444'::uuid, -5, 'beratung', 'stattgefunden')
) as t(user_id, tage, typ, status)
join public.partner p on p.user_id = t.user_id;

insert into public.todos (partner_id, titel, faellig_am, erledigt, quelle, erstellt_von)
select
  p.id, t.titel, current_date + t.tage, t.erledigt, t.quelle,
  (select id from public.partner where user_id = '22222222-2222-2222-2222-222222222222')
from (values
  ('44444444-4444-4444-4444-444444444444'::uuid,
   'Führungszeugnis beantragen', 3, false, 'vorgesetzter'),
  ('44444444-4444-4444-4444-444444444444'::uuid,
   'Namensliste auf 50 Kontakte bringen', 7, false, 'vorgesetzter'),
  ('33333333-3333-3333-3333-333333333333'::uuid,
   'Modul Produkte abschliessen', -2, true, 'selbst')
) as t(user_id, titel, tage, erledigt, quelle)
join public.partner p on p.user_id = t.user_id;

-- Jonas hat sein Führungszeugnis abgegeben; die Folgeaktion ist offen und
-- fällig — der Testfall für die spätere Erinnerungs-Automatik.
insert into public.onboarding_trigger (partner_id, trigger_typ, ausgeloest_am,
                                       aktion_faellig_am, aktion_erledigt)
select
  p.id, 'fuehrungszeugnis_abgegeben', now() - interval '2 days',
  current_date + 5, false
from public.partner p
where p.user_id = '44444444-4444-4444-4444-444444444444';

-- ---------------------------------------------------------------------------
-- Akademie — ein Modul je Freischaltstufe, damit min_role sichtbar greift.
-- Inhalte sind Demo-Text und kommen später vom Vertrieb.
-- ---------------------------------------------------------------------------
insert into public.akademie_module (id, titel, beschreibung, min_role, reihenfolge, kategorie)
values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   'Ankommen', 'Was in den ersten Tagen zählt.',
   'gp_frisch', 1, 'ergo_basics'),
  ('aaaaaaaa-0000-0000-0000-000000000002',
   'Anmeldung und Papiere', 'Führungszeugnis, IHK, Vertrag — Schritt für Schritt.',
   'gp_frisch', 2, 'anmeldung'),
  ('aaaaaaaa-0000-0000-0000-000000000003',
   'Verkauf vertiefen', 'Erst ab Stufe 2 sichtbar — der Test für min_role.',
   'gp_stufe2', 1, 'stufe2')
on conflict (id) do nothing;

insert into public.akademie_lektionen (id, modul_id, titel, video_url, inhalt_markdown, reihenfolge)
values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Willkommen', null,
   '# Willkommen

Demo-Inhalt. Die echten Texte kommen vom Vertrieb.', 1),
  ('bbbbbbbb-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'Führungszeugnis beantragen', null,
   '# Führungszeugnis

Demo-Inhalt. Die echten Texte kommen vom Vertrieb.', 1),
  ('bbbbbbbb-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000003',
   'Einwände sauber auflösen', null,
   '# Einwände

Demo-Inhalt. Die echten Texte kommen vom Vertrieb.', 1)
on conflict (id) do nothing;

insert into public.akademie_tests (lektion_id, frage, antworten, richtige_antwort)
values
  ('bbbbbbbb-0000-0000-0000-000000000002',
   'Wo beantragst du das erweiterte Führungszeugnis?',
   '["Beim Bürgeramt", "Bei der IHK", "Bei der Krankenkasse"]'::jsonb,
   0);

-- Jonas hat die erste Lektion durch, den Rest noch nicht.
insert into public.akademie_fortschritt (partner_id, lektion_id, abgeschlossen_am, test_bestanden)
select p.id, 'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '1 day', false
from public.partner p
where p.user_id = '44444444-4444-4444-4444-444444444444'
on conflict (partner_id, lektion_id) do nothing;
