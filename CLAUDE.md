# Strothi's Hub — Kontext für Claude

Persönliches Multi-Tool-Webportal von Felix (`felixstrothmann@t-online.de`), deployed auf einem
Plesk-VPS unter **hub.strothi.de** (kein SSH, aber browser-basierte Root-Shell in Plesk).
Ursprünglich Ein-Nutzer-Anwendung, seit Kurzem mehrnutzerfähig (E-Mail-Einladungen).

Stand dieser Datei: 2026-08-17. Bei Widersprüchen zum tatsächlichen Code gewinnt der Code —
diese Datei beschreibt den Stand zu einem Zeitpunkt, nicht live.

## Tech-Stack

- **Frontend**: React 18 + TypeScript + Vite, reines CSS (keine Component-Library, kein Tailwind)
- **Backend**: Node/Express 4 + TypeScript, Prisma ORM auf **MariaDB/MySQL** (nicht Postgres —
  die generische `README.md` ist veraltet und sollte nicht als Quelle vertraut werden)
- **Deployment**: Plesk/Passenger — ein dauerhafter Node-Prozess pro (Sub-)Domain, kein
  Serverless. Im Produktionsmodus (`NODE_ENV=production`) hostet der Backend-Prozess selbst
  auch das gebaute Frontend (`frontend/dist`) inkl. SPA-Fallback — im lokalen Dev übernimmt
  stattdessen der Vite-Dev-Server (Port 3000, proxied `/api` + `/uploads` zu Port 5000).

## Architektur-Muster

**Backend** — Monolith mit Modulen, striktes Drei-Datei-Schema pro Tool:
`backend/src/modules/<tool>/<tool>.service.ts` (Prisma/Business-Logik) +
`<tool>.controller.ts` (req/res, nutzt durchgängig `req.user!.id`) + `<tool>.routes.ts`
(mountet `authenticate` + `requireTool('<key>')` via `router.use(...)`). Zentral verdrahtet in
`backend/src/routes/index.ts`, dort unter `/api` gemountet. Tool-Registry (Anzeigename, Icon,
`comingSoon`-Flag) lebt separat in `backend/src/config/tools.ts` — das Frontend-Dashboard
konsumiert Tools dynamisch über `GET /api/tools`, keine hartcodierte Tool-Liste im Frontend.

Cross-cutting Services (nicht tool-gebunden) liegen direkt unter `backend/src/services/`:
`auth.service.ts`, `invite.service.ts`, `push.service.ts`, `mailer.service.ts`,
`templateEngine.ts`. `push.service.ts` war ursprünglich im `erinnerungen`-Modul, wurde aber
herausgelöst, da Push-Subscriptions generisch pro Nutzer sind, nicht tool-spezifisch.

Middleware: `authenticate` (JWT prüfen, `req.user` setzen), `requireAdmin`, `requireTool(key)`
(Admin kommt immer durch, sonst `UserToolAccess`-Check). `AppError` (statusCode + message) wird
in Services geworfen und zentral von `errorHandler` gefangen; `express-async-errors` ist ganz
oben in `index.ts` importiert, daher kein try/catch in async Route-Handlern nötig.

**Frontend** — Pfad-Aliase (`@components`, `@pages`, `@services`, `@app-types`, `@utils`,
`@context`, `@config`, `@styles`, `@hooks`, `@` = `./src`) sowohl in `vite.config.ts` als auch
`tsconfig.json` gepflegt (bei Änderung beide anfassen). Jedes Tool hat eine `*Layout.tsx`
(Sub-Nav + `<Outlet/>`), Seiten holen Daten selbst per `useState`/`useEffect` +
`services/<tool>.service.ts` (kein Redux/Zustand/React-Query). `services/api.ts` ist eine
einzelne Axios-Instanz: Request-Interceptor hängt `Authorization: Bearer <token>` aus
`localStorage['token']` an, Response-Interceptor macht bei `401` einen harten Redirect zu
`/login` (kein React-State-Logout). `config/api.ts` bündelt alle Backend-Pfade in
`API_ENDPOINTS`. `AuthContext` hält `user`, `tools`, `dashboardPreferences`,
`hasToolAccess(toolKey)` (Admin immer `true`).

UI-Kit (`components/ui/`) ist bewusst minimal: `Button`, `Card`, `Input`, `ThemeToggle` — **kein**
`Modal`/`Select`/`Table`/`Toast`. Modals/Tabellen/Charts werden pro Tool ad-hoc gebaut (z.B.
`DayStatusModal.tsx`, `StatusBarChart.tsx` in `pages/homeoffice/`). CSS ist handgeschrieben,
global (BEM-artige Klassennamen), Design-Tokens als CSS-Custom-Properties in `styles/variables.css`
(`:root` = Dark-Theme-Default, `.light`-Klasse überschreibt für Light-Mode). `ThemeToggle`
togglet `light`-Klasse auf `<html>` + persistiert in `localStorage['theme']` — es gibt **kein**
Bootstrap-Skript vor dem React-Mount, das den gespeicherten Wert früh liest, d.h. bei Light-Mode-
Nutzern kann kurz das dunkle Default-Theme aufblitzen.

## Tools — aktueller Stand

| Key | Name | Status |
|---|---|---|
| `farsi` | Farsi-Lernapp | ✅ Fertig gebaut (Wörterbuch, Karteikarten/Leitner, Alphabet-Referenz, Arbeitsfläche) |
| `homeoffice` | Arbeitsnachweis | ✅ Fertig gebaut (Woche/Monat/Jahr-Ansicht, Bundesland-Verwaltung, PDF-Export) |
| `erinnerungen` | Erinnerungen | ✅ Fertig gebaut (Erinnerungen + Geburtstage, Web Push) |
| `haushaltsbuch` | Haushaltsbuch | 🚧 nur Registry-Stub, keine Implementierung |
| `kleingewerbe` | Kleingewerbe | 🚧 nur Registry-Stub, keine Implementierung |
| `notizen` | Notizen | 🚧 nur Registry-Stub, keine Implementierung |
| `kochbuch` | Kochbuch | 🚧 nur Registry-Stub, keine Implementierung |

Die vier Stub-Tools existieren nur als `comingSoon: true`-Einträge in `tools.ts` (steuert die
"Bald verfügbar"-Kachel im Dashboard) — kein `modules/`-Ordner, keine Prisma-Modelle, keine
Routen. Bei Arbeit an einem dieser Namen: komplett neu aufbauen, nicht nach bestehendem Code suchen.

### `homeoffice` — Kurzüberblick (weniger vertraut als farsi/erinnerungen)

Pro-Nutzer-Log, wo an welchem Wochentag gearbeitet wurde (Büro/Home-Office/Urlaub/Feiertag/
Krank). Tage ohne expliziten DB-Eintrag (`WorkDayEntry`) werden zur Laufzeit aufgelöst:
automatische Feiertagserkennung über `date-holidays` (gecacht pro Bundesland+Jahr), abhängig
vom zum jeweiligen Datum gültigen Bundesland (`UserFederalState`-Historie mit `validFrom`, für
Umzüge). Nur Wochentage werden betrachtet. Zwei bewusst getrennte Datums-Helfer
(`toISODate`/`parseISODate` lokal vs. `toPrismaDate`/`fromPrismaDate` UTC) — Vermischen erzeugt
Off-by-one-Day-Bugs. Jahresansicht vergleicht 3 Jahre per Balkendiagramm, hat PDF-Export
(`jspdf`, lazy-`import()`ed) und manuelle Urlaubstage-Korrekturen (`VacationAdjustment`).

## Datenmodell

Vollständiges, aktuelles Schema: `backend/prisma/schema.prisma` (nicht lang, direkt lesen statt
hier duplizieren). Modelle: `User`, `InviteToken`, `UserToolAccess`, `WorkDayEntry`,
`UserFederalState`, `VacationAdjustment`, `FarsiEntry`, `FarsiProgress`, `FarsiLetterProgress`,
`Reminder`, `Person`, `PersonCongratsLog`, `PushSubscription`, `NotificationLog`.

## Bekannte Fallstricke

- **Lokale DB läuft über XAMPP, kein Windows-Dienst**: MariaDB/MySQL läuft lokal über XAMPP
  (`C:\xampp`), nicht als registrierter Windows-Dienst — nach einem Neustart des Rechners läuft
  sie nicht automatisch mit. Prüfen via `netstat -ano | grep ":3306 " | grep -i abh`; falls leer,
  starten mit `cmd //c "C:\xampp\mysql_start.bat"` (im Hintergrund laufen lassen, blockiert sonst).
- **Windows-Datei-Lock bei Prisma-Migrationen**: läuft der `tsx watch`-Dev-Server, hält er die
  Query-Engine-DLL offen → `prisma generate`/`migrate` schlägt mit `EPERM` fehl. Immer erst den
  Prozess auf Port 5000 killen (`netstat -ano | grep ":5000 " | grep -i abh` → `taskkill //PID <pid> //F`),
  dann Migration, dann neu starten.
- **`tsx watch` + manueller Neustart können kollidieren**: wird eine Datei gespeichert während
  gleichzeitig manuell `taskkill`+neu gestartet wird, kann es zu einer Race Condition um Port 5000
  kommen (zwei Prozesse wollen binden, einer crasht mit `EADDRINUSE`, der Server ist dann kurz
  down). Nach so einem Vorfall: Port-Inhaber prüfen, sauber killen, einmal frisch starten,
  `curl http://localhost:5000/api/health` zur Bestätigung.
- **Nicht-interaktive `prisma migrate dev`-Prompts**: wenn Prisma eine Bestätigung verlangt
  (auch bei harmlosen additiven Änderungen) und die Umgebung nicht-interaktiv ist, entweder
  `--create-only` verwenden oder den Migrationsordner + `migration.sql` manuell schreiben und
  per `npx prisma migrate deploy` anwenden.
- **`@db.Date`-Felder + `res.json()`**: Prisma liefert `@db.Date`-Felder als volles ISO-Datetime
  (`res.json()` ruft intern `.toISOString()`), das Frontend erwartet aber reines `YYYY-MM-DD`
  für `<input type="date">`. Immer über einen `toDateOnly()`-Helper in der DTO-Konvertierung
  entschärfen (Präzedenzfall: `erinnerungen.service.ts`), sonst "Invalid Date"-Bugs im Frontend.
- **Service-Worker-Updates**: `sw.js` hat `skipWaiting()`/`clients.claim()` — neue Versionen
  aktivieren sich automatisch, ohne dass alle Tabs geschlossen werden müssen. Lokal beim
  Debuggen: ein manuelles "Abmelden" des Workers in `about:debugging` (Firefox) killt auch die
  zugehörige Push-Subscription serverseitig (Browser-Standardverhalten) — danach muss "Push
  aktivieren" erneut geklickt werden.
- **`.env`-Änderungen brauchen einen echten Prozess-Neustart** (nicht nur `tsx watch`s
  Auto-Reload, der reagiert nur auf Code-Änderungen) — z.B. nach Hinzufügen von SMTP/VAPID-Keys.
- Produktions-`.env` (VAPID-Keys, SMTP-Zugangsdaten, JWT-Secret) wird **nie** automatisch
  deployed — Felix trägt das manuell in die Server-`.env` ein, danach App in Plesk neu starten.

## Deployment-Ablauf (Plesk)

```
cd .../backend && npm install && npm run build   # npm install triggert automatisch prisma generate (postinstall)
cd .../frontend && npm install && npm run build
# bei Schema-Änderungen zusätzlich: Node.js-Bereich in Plesk → run_script → db:migrate:prod
# danach: App in Plesk neu starten (sonst laufen alte .env-Werte/alter Code weiter)
```
Volle Befehle inkl. `PATH`/`NODE_OPTIONS`-Flags stehen in `README.md`.

## Bekannte Altlasten / TODOs

- `frontend/src/hooks/useApi.ts` und `frontend/src/utils/helpers.ts` sind ungenutzt (kein Import
  irgendwo im Code) — Kandidaten zum Löschen, falls beim Aufräumen relevant.
- `.gitkeep`-Dateien in `pages/`, `components/{common,layout,ui}/` sind Reste vom initialen
  Scaffolding, Ordner sind längst befüllt — kann weg, aber harmlos.
- `README.md` ist ein generisches Ausgangs-Template (nennt PostgreSQL statt MariaDB) und wird
  nicht gepflegt — für Kontext auf diese Datei verlassen, nicht auf die README.
- `frontend/public/site.webmanifest`'s `theme_color`/`background_color` (`#ffffff`) weicht vom
  `<meta name="theme-color">` in `index.html` (`#0f172a`) ab — nicht abgestimmt, aber bisher
  nicht als Problem gemeldet.

## Arbeitsweise, die sich bewährt hat

- Neue Migrationen: Windows-Lock-Workaround (s.o.), danach `npx prisma migrate dev --create-only`
  + Review der generierten SQL, dann `migrate deploy` zum Anwenden.
- Manuelles Testen: Playwright-Skripte (`node_modules/.bin/playwright` liegt unter
  `frontend/node_modules`, Skripte müssen von dort aus mit `node` ausgeführt werden, damit das
  `playwright`-Package auflöst) — Skript als `_test-*.mjs` ins jeweilige Projektverzeichnis
  schreiben, ausführen, danach wieder löschen. Testdaten (Nutzer, Reminders, Subscriptions) nach
  jedem Testlauf aus der lokalen DB wieder entfernen (per `node -e "..."` mit Prisma-Client),
  echte Nutzerdaten anhand `createdAt`/Namen von Testdaten unterscheiden.
- Vor "fertig" melden: `npx tsc --noEmit` in beiden Projekten, dann `npm run build` in beiden.
- Bei Datenabweichungen/unerwartetem DB-Zustand: erst nachfragen, ob der Nutzer selbst manuell
  etwas geändert hat, bevor mehrstufige forensische Diagnose gestartet wird.
