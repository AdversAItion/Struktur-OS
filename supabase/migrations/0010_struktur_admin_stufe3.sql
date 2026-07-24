-- 0010 — Struktur-Admin ab Karrierestufe 3 (Audit).
-- Entscheidung des Nutzers: Ein Partner ab Stufe 3 darf SEINE EIGENE Struktur
-- (die rekursive Downline) verwalten — nicht die ganze Firma. Konkret:
--   * sehen  : die Stammdaten seiner Downline (bisher nur ab Führungskraft/Rang 30)
--   * ändern : Karrierestufe hochsetzen und aktiv/inaktiv schalten ("rausnehmen")
-- Bewusst NICHT über diese Schiene: Rolle (App-Recht, inkl. master) und upline_id
-- (Umhängen in fremde Strukturen) bleiben master-only. Neue Partner anlegen
-- ("hinzufügen") kommt separat über den Einladungs-Flow (service_role).
-- Schema-Doku: docs/SCHEMA.md (nach jeder Migration aktualisieren).

-- ---------------------------------------------------------------------------
-- Alt-Wert der Zielzeile lesen. SECURITY DEFINER, sonst greift die partner-RLS
-- rekursiv (dieselbe Endlosschleife, die meine_rolle()/ist_in_meiner_struktur()
-- vermeiden). In einer UPDATE-Policy sieht `with check` nur NEW; diese Funktion
-- liefert die committete Alt-Zeile, gegen die unveränderliche Felder gepinnt
-- werden — dieselbe OLD-Ersatz-Technik wie meine_stufe() in 0001.
-- ---------------------------------------------------------------------------
create or replace function public.partner_alt(ziel uuid)
returns public.partner
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.partner where id = ziel;
$$;

-- ---------------------------------------------------------------------------
-- SELECT: Stufe 3+ sieht die eigene Downline (analog partner_select_struktur,
-- aber an der Karrierestufe statt an der App-Rolle festgemacht).
-- ---------------------------------------------------------------------------
create policy partner_select_struktur_stufe3 on public.partner
  for select to authenticated
  using (
    public.meine_stufe() >= 3
    and public.ist_in_meiner_struktur(id)
  );

-- ---------------------------------------------------------------------------
-- UPDATE: Stufe 3+ darf in der eigenen Downline NUR `stufe` und `aktiv` ändern.
-- Alle anderen Felder werden gegen die Alt-Zeile gepinnt. `stufe` ist nach oben
-- durch die eigene Stufe gedeckelt (keine Eskalation über das eigene Level).
-- Der master ändert weiterhin alles über partner_update_master (unberührt).
-- ---------------------------------------------------------------------------
create policy partner_update_struktur_admin on public.partner
  for update to authenticated
  using (
    public.meine_stufe() >= 3
    and public.ist_in_meiner_struktur(id)
  )
  with check (
    public.meine_stufe() >= 3
    and public.ist_in_meiner_struktur(id)
    -- kein Hochstufen über die eigene Stufe hinaus
    and stufe <= public.meine_stufe()
    -- alles außer stufe und aktiv bleibt unverändert
    and rolle             =                 (public.partner_alt(id)).rolle
    and upline_id         is not distinct from (public.partner_alt(id)).upline_id
    and user_id           =                 (public.partner_alt(id)).user_id
    and name              =                 (public.partner_alt(id)).name
    and email             is not distinct from (public.partner_alt(id)).email
    and aktiv_seit        =                 (public.partner_alt(id)).aktiv_seit
    and wochenziel_termine =                (public.partner_alt(id)).wochenziel_termine
  );
