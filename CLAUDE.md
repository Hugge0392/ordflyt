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

## SEO-Optimering (ALLTID IMPLEMENTERA)

### Intelligent Innehållsbaserad SEO
Systemet ska **automatiskt** anpassa SEO-element baserat på sidans befintliga innehåll:

#### 1. Title Tags - Intelligent Extraktion
- **Analysera H1-taggar** och använd som bas för titel
- **Identifiera återkommande fraser** i sidans text
- **Behåll viktiga termer** som upprepas genom innehållet
- **Format**: "[Huvudsakligt innehåll] | [Appnamn]"
- **Längd**: 50-60 tecken, prioritera viktigaste orden först

#### 2. Meta Descriptions - Innehållsdriven
- **Sammanfatta från första stycket** eller huvudinnehåll
- **Inkludera fraser som återkommer** på sidan
- **Bevara användarens ordval** från original innehåll
- **Längd**: 150-160 tecken
- **Naturligt språk** som speglar sidans ton

#### 3. URL Slugs - Baserade på Rubriker
- **Extrahera från H1 eller page title**
- **Använd användarens ursprungliga ordval**
- **Konvertera till url-vänligt format** (bindestreck, gemener)
- **Behåll svenska termer** som användaren valt

#### 4. Automatisk Innehållsanalys
```typescript
// Funktion som analyserar sidinnehåll för SEO
const extractSeoFromContent = (content: string, headings: string[]) => {
  // Hitta mest förekommande fraser (2-3 ord)
  const phrases = extractRepeatingPhrases(content);

  // Använd H1 som bas för titel
  const mainHeading = headings[0];

  // Skapa titel från huvudrubrik + viktiga fraser
  const title = generateTitle(mainHeading, phrases);

  // Extrahera beskrivning från första meningsstycket
  const description = extractDescription(content, phrases);

  // Generera URL från huvudrubrik
  const slug = generateSlug(mainHeading);

  return { title, description, slug };
};
```

#### 5. Rubrikstruktur-Optimering
- **Analysera befintlig H1-H6 hierarki**
- **Bevara användarens rubrikordning**
- **Säkerställ endast en H1 per sida**
- **Extrahera nyckelfraser från underrubriker**

#### 6. Automatiska SEO-Kontroller
- ✅ Extrahera titel från huvudinnehåll (H1/första stycket)
- ✅ Identifiera återkommande viktiga fraser
- ✅ Generera beskrivning från faktiskt sidinnehåll
- ✅ Skapa URL-slug från huvudrubrik
- ✅ Bevara användarens ordval och tonalitet
- ✅ Anpassa längder för optimal visning

**PRINCIP**: Systemet ska ALDRIG uppfinna nya nyckelord utan alltid basera SEO-optimering på det innehåll och de termer som användaren redan har skapat och prioriterat.