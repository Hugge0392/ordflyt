# Custom Instructions för Läsförståelseapp

## Projektöversikt

Detta är en omfattande läsförståelseapp för elever i åldern 9-12 år med ett rollbaserat system som möjliggör skalbar utbildningshantering:

- **ADMIN**: Skaper lektionsmallar, hanterar innehåll och systemadministration
- **LÄRARE**: Skickar ut lektioner till sina elever, skapar klasser och följer elevutveckling
- **ELEV**: Löser uppgifter, personaliser avatarer/rum och samlar progression

### Pedagogisk Fokus
- Icke-stressande lärmiljö med gamification
- Engagerande visuell design och interaktivitet
- Individualiserad progression och feedback
- Svenska språket i fokus för målgruppen 9-12 år

## Teknisk Arkitektur

### Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Wouter (routing)
- **Backend**: Express.js (ESM), TypeScript
- **Databas**: PostgreSQL med Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui + Radix UI primitives
- **State Management**: TanStack Query för server-state
- **Autentisering**: Session-baserad med Argon2id hashning

### Projektstruktur
```
/client/src/
  pages/          # Huvudsidor grupperade efter funktion
  components/     # Återanvändbara komponenter
  hooks/          # Custom React hooks
  lib/            # Utilities och konfiguration
  contexts/       # React contexts

/server/
  routes.ts       # Huvudroutingfil (232K+ rader)
  auth.ts         # Autentiseringlogik
  storage.ts      # Filhantering och objektlagring
  types/          # TypeScript definitioner

/shared/
  schema.ts       # Delad databaschema (Drizzle + Zod)
```

## Utvecklingskonventioner

### Kodstil och Patterns
- **TypeScript strict mode** - all kod ska vara typesafe
- **Komponentstruktur**: Functional components med hooks
- **Props typing**: Explicita interfaces för alla props
- **Error boundaries**: Använd ErrorBoundary för stabilitet
- **Naming**: Svenska termers för domän-specifika koncept (lärarar, elever, lektioner)

### Databasschema Konventioner
- **Enums används** för statusvärden och roller (userRoleEnum, progressStatusEnum etc.)
- **UUID som primary keys** via `gen_random_uuid()`
- **Timestamp tracking** för created/updated datum
- **Relationella integritet** med foreign keys och constraints

### API och Routing
- RESTful endpoints organiserade efter funktion
- Session-baserad autentisering med CSRF-skydd
- Rate limiting för säkerhet
- Rollbaserad åtkomstkontroll (RBAC)

## Viktiga Utvecklingsriktlinjer

### 1. Pedagogisk Hänsyn
- **Alltid prioritera elevernas lärupplevelse** - undvik komplex UI för elever
- **Feedback ska vara uppmuntrande** och konstruktiv
- **Progressionssystem** ska vara synligt men inte överväldigande
- **Tillgänglighet** - stöd för färgkombinationer och textstorlekar

### 2. Språkhantering
- **Svenska terminologi** för UI-element som riktar sig till svenska användare
- **Engelska kodnamn** för tekniska komponenter och variabelnamn
- **Konsekvent översättning** av pedagogiska begrepp

### 3. Säkerhet och Integritet
- **Aldrig exponera känslig elevdata** utan lärarauktorisation
- **Validera all indata** med Zod schemas
- **Sanitisera användarinput** särskilt i rich text editors
- **Auditloggning** för viktiga händelser (klass-/elevhantering)

### 4. Performance och Skalbarhet
- **Lazy loading** för stora komponenter och bilder
- **Optimistisk uppdateringar** med TanStack Query
- **Bildbomprimering** för user-genererat innehåll
- **Caching strategier** för lektionsdata

## Vanliga Utvecklingsuppgifter

### Lägg till ny lektionstyp
1. Uppdatera `assignmentTypeEnum` i schema.ts
2. Skapa motsvarande komponenter i `/components/`
3. Lägg till routing i App.tsx
4. Implementera backend-logik i routes.ts
5. Testa med alla tre roller

### Skapa ny elevfunktion
1. Kontrollera åtkomsträttigheter (endast ELEV-roll)
2. Designa med gamification i åtanke
3. Implementera progressionstracking
4. Testa responsivitet för olika enheter

### Utöka lärarverktyg
1. Säkerställ att endast LÄRARE-rollen har åtkomst
2. Fokusera på elevdata och progressionsinsikter
3. Implementera exportfunktionalitet om relevant
4. Testa med stora datamängder (många elever/klasser)

### Admin-funktionalitet
1. Implementera med högsta säkerhetsnivå
2. Inkludera audit trails för kritiska operationer
3. Designa för effektiv contenthantering
4. Validera all data noggrant innan sparning

## Testning och Kvalitet

### Teststrategi
- **Enhetstester** för kritisk affärslogik
- **Integrationstester** för autentiseringsflöden
- **E2E-tester** för huvudanvändarflöden
- **Manuell testning** med alla tre rollerna

### Kvalitetskontroller
- **TypeScript kompilering** utan varningar
- **Linting** enligt projektets ESLint-regler
- **Säkerhetsgranskning** för nya funktioner
- **Performance-mätning** för nya komponenter

## Vanliga Kommandon

```bash
# Utveckling
npm run dev          # Starta utvecklingsserver

# Bygge och test
npm run build        # Bygg produktionsversion
npm run check        # TypeScript kompilering

# Databas
npm run db:push      # Uppdatera databaschema
```

## Troubleshooting

### Vanliga Problem
- **Autentiseringsfel**: Kontrollera session middleware och CSRF-tokens
- **TypeScript-fel**: Uppdatera shared schema types
- **Performance**: Inspektera TanStack Query devtools
- **Stilproblem**: Verifiera Tailwind class precedence

### Debug Tips
- Använd React Developer Tools för komponentinspektion
- Network tab för API-anrop
- PostgreSQL logs för databasfrågor
- Console för client-side JavaScript fel

---

## VIKTIGT FÖR CLAUDE

När du arbetar med detta projekt:

1. **Förstå rollperspektivet** - fråga alltid vilken användarroll som påverkas
2. **Prioritera elevernas säkerhet** - aldrig kompromissa med barn säkerhet
3. **Respektera pedagogiska principer** - undvik överväldigande interfaces
4. **Använd befintliga patterns** - följ kodkonventioner och komponentstruktur
5. **Testa med alla roller** - säkerställ att åtkomstbehörigheter fungerar korrekt
6. **Dokument era ändringar** - uppdatera relevanta kommentarer och dokumentation

För komplex funktionalitet, börja alltid med att granska befintlig kod för liknande implementationer.