# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektöversikt

En omfattande läsförståelseapp för elever i åldern 9-12 år med rollbaserat system:

- **ADMIN**: Skapar lektionsmallar, hanterar innehåll och systemadministration
- **LÄRARE**: Skickar ut lektioner till sina elever, skapar klasser och följer elevutveckling
- **ELEV**: Löser uppgifter, personaliserar avatarer/rum och samlar progression

### Pedagogiska Principer
- Icke-stressande lärmiljö med gamification
- Svenska språket för målgruppen 9-12 år
- Engagerande visuell design och individualiserad progression

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Wouter (routing)
- **Backend**: Express.js (ESM) + TypeScript
- **Databas**: PostgreSQL med Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **State**: TanStack Query för server-state
- **Auth**: Session-baserad med Argon2id hashning

## Projektstruktur

```
/client/src/
  pages/          # 70+ sidor för olika roller och funktioner
  components/     # Återanvändbara komponenter
  hooks/          # Custom React hooks
  lib/            # Utilities och konfiguration
  contexts/       # React contexts

/server/
  routes.ts       # Huvudroutingfil (6100+ rader)
  auth.ts         # Autentiseringlogik
  storage.ts      # Filhantering och objektlagring
  authRoutes.ts   # Auth endpoints
  licenseRoutes.ts # License management
  emailService.ts # Email integration (Postmark)
  types/          # TypeScript definitioner

/shared/
  schema.ts       # Databaschema (Drizzle + Zod)
```

## Vanliga Kommandon

```bash
# Utveckling
npm run dev          # Starta utvecklingsserver (port 5000)

# Bygge och test
npm run build        # Bygg produktionsversion (Vite + esbuild)
npm run start        # Kör produktionsversion
npm run check        # TypeScript kompilering

# Databas
npm run db:push      # Uppdatera databaschema till PostgreSQL
```

## Utvecklingskonventioner

### TypeScript och Kodstil
- **Strict mode aktiverad** - all kod ska vara typesafe
- **Path aliases**: `@/` för client/src, `@shared/` för shared
- **Functional components** med hooks
- **Props typing**: Explicita interfaces för alla props
- **Naming**: Svenska termer för domän-specifika koncept (lärarar, elever, lektioner), engelska för tekniska variabler

### Databasschema
- **Enums** för statusvärden och roller: `userRoleEnum`, `progressStatusEnum`, `assignmentTypeEnum`, etc.
- **UUID primary keys** via `gen_random_uuid()`
- **Timestamp tracking**: created_at/updated_at
- **Foreign keys och constraints** för relationell integritet
- Schema definieras i `/shared/schema.ts` och delas mellan frontend/backend

### API och Routing
- RESTful endpoints i `/server/routes.ts`
- Session-baserad autentisering med CSRF-skydd
- Rate limiting för API endpoints
- Rollbaserad åtkomstkontroll (RBAC)
- Error handling med Express middleware

### Säkerhet
- **Aldrig exponera känslig elevdata** utan lärarauktorisation
- **Validera all indata** med Zod schemas
- **Sanitisera användarinput** särskilt i rich text editors
- **Auditloggning** för viktiga händelser (implementerat i licenseDb.ts)
- Security headers via Helmet
- Argon2id för password hashing

## Rollbaserad Arkitektur

### Admin-funktionalitet
- Lesson template builder
- Content management (reading lessons, vocabulary, grammar)
- User account management
- Blog/newsletter system med SEO-optimering
- Högsta säkerhetsnivå med audit trails

### Lärare-funktionalitet
- Lesson browsing och assignment creation
- Klasshantering och elevadministration
- Progress tracking och analytics
- Export till CSV/Excel/PDF
- Email notifications via Postmark

### Elev-funktionalitet
- Assignment player med olika lektionstyper
- Avatar builder och room decorator
- Shop system med currency management
- Progress tracking och achievements
- Accessibility settings (themes, text size)

## Viktiga System

### Autentisering
- Session-based med connect-pg-simple
- CSRF tokens
- Device fingerprinting
- Role-based middleware
- Teacher registration med one-time codes

### Object Storage
- Replit Object Storage integration
- Image upload och compression
- File management för lesson content
- Används för avatars, room decorations, lesson images

### WebSocket Features
- Classroom real-time collaboration
- Klasskamp (class battle game)
- Session management

### Email System
- Postmark integration (emailService.ts)
- Teacher registration verification
- Password reset
- Notifications

## Vanliga Utvecklingsuppgifter

### Lägg till ny lektionstyp
1. Uppdatera `assignmentTypeEnum` i shared/schema.ts
2. Skapa player-komponent i `/client/src/components/`
3. Lägg till routing i App.tsx
4. Implementera backend endpoints i routes.ts
5. Testa med alla tre roller (ADMIN, LÄRARE, ELEV)

### Lägg till ny admin-funktion
1. Skapa page i `/client/src/pages/admin-*.tsx`
2. Implementera backend routes med admin auth check
3. Lägg till navigation i admin.tsx
4. Inkludera audit logging för kritiska operationer
5. Validera all data noggrant innan sparning

### Lägg till ny elev-funktion
1. Kontrollera åtkomsträttigheter (endast ELEV-roll)
2. Designa med gamification i åtanke
3. Implementera progressionstracking
4. Testa responsivitet för olika enheter
5. Säkerställ att data inte exponeras för andra elever

## Debugging och Troubleshooting

### TypeScript-fel
- Kör `npm run check` för att se alla kompileringsfel
- Kontrollera att path aliases är korrekt konfigurerade
- Uppdatera shared schema types om databasschema ändrats

### Autentiseringsfel
- Kontrollera session middleware i server/index.ts
- Verifiera CSRF-tokens
- Inspektera cookies i browser devtools
- Kontrollera role-based access control i routes

### Performance
- Använd TanStack Query devtools för cache inspection
- Kontrollera network tab för onödiga API-anrop
- Inspektera PostgreSQL logs för långsamma queries
- Använd React Developer Tools för render profiling

### Database
- Schema ändringar: uppdatera shared/schema.ts och kör `npm run db:push`
- Migrations finns i server/migration/
- Backup system körs automatiskt (licenseDb.ts)

## Replit Environment

- Development server körs på port 5000
- PostgreSQL database inkluderad
- Object Storage konfigurerad via REPL_ID
- Auto-deployments till production via Replit Autoscale
- Environment variables hanteras via Replit Secrets

## VIKTIGT FÖR CLAUDE

När du arbetar med detta projekt:

1. **Förstå rollperspektivet** - fråga alltid vilken användarroll som påverkas
2. **Prioritera elevernas säkerhet** - aldrig kompromissa med barns säkerhet
3. **Respektera pedagogiska principer** - undvik överväldigande interfaces
4. **Använd befintliga patterns** - följ kodkonventioner och komponentstruktur
5. **Testa med alla roller** - säkerställ att åtkomstbehörigheter fungerar korrekt
6. **Svenska terminologi** för användargränssnitt, engelska för kod

För komplex funktionalitet, börja alltid med att granska befintlig kod för liknande implementationer.
