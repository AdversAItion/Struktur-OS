# Modul `struktur`

Struktur-Verwaltung ab Karrierestufe 3 (Audit). Ein Leiter (Stufe ≥ 3) sieht
seine gesamte rekursive Downline und kann sie leichtgewichtig verwalten —
ohne master zu sein.

## Zweck
Der master verwaltet die ganze Firma über das Dashboard. Ab Stufe 3 bekommt ein
Partner ein **auf seine eigene Struktur begrenztes** Admin-Recht:
- **Hochstufen**: Karrierestufe eines Downline-Partners setzen, gedeckelt auf die
  eigene Stufe (ein Stufe-3-Leiter kann bis Stufe 3 hochstufen).
- **Aktiv/inaktiv** schalten ("rausnehmen" und wieder reinnehmen).

Bewusst **nicht** über dieses Modul: Rolle (App-Recht, inkl. master) und
`upline_id` (Umhängen in fremde Strukturen) — die bleiben master-only. Neue
Partner **anlegen** ("hinzufügen") kommt separat über den Einladungs-Flow
(`service_role`, noch offen).

## Tabellen
- `partner` — gelesen und (nur `stufe`/`aktiv`) geschrieben. Keine eigene Tabelle.

## Komponenten
- `StrukturSeite.tsx` — Liste der Downline mit Stufen-Auswahl und Aktiv-Schalter.
- `api.ts` — `meineStrukturLaden`, `stufeSetzen`, `aktivSetzen`. Kein
  supabase-Zugriff in der Komponente (Merge-Regel 3).

## Abhängigkeiten
- `@/modules/auth` — `useAuth` (`darf`, `darfStufe`), `Partner`, Labels.
- Route `/struktur` in `src/App.tsx`, gated per `min_stufe={3}`.
- Nav-Eintrag in `src/components/AppShell.tsx` (sichtbar ab Stufe 3).

## RLS (Migration 0010)
Die Rechte liegen vollständig in der Datenbank; das UI spiegelt sie nur:
- `partner_select_struktur_stufe3` — Stufe ≥ 3 sieht `ist_in_meiner_struktur(id)`.
- `partner_update_struktur_admin` — Stufe ≥ 3 ändert in der eigenen Struktur nur
  `stufe` (≤ eigene Stufe) und `aktiv`; alle anderen Felder sind gegen die
  Alt-Zeile (`public.partner_alt(id)`) gepinnt.

Autorität ist immer die RLS. Das UI-Gating (`darfStufe(3)`, Route-Guard) versteckt
nur — sperren tut die Datenbank.
