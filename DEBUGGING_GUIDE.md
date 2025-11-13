# Debugging Guide för Ordflyt på Vercel

Den här guiden visar hur du effektivt debuggar ditt publicerade projekt på Vercel utan att behöva kopiera loggar manuellt.

## 🎯 Snabbstart

### 1. Debug-Endpoints (Rekommenderat!)

Ditt projekt har nu debug-endpoints som du kan använda för att inspektera systemet live:

#### Health Check
```bash
curl https://ditt-projekt.vercel.app/api/debug/health
```

Visar:
- Systemstatus
- Databasanslutning
- Miljövariabler (NODE_ENV, VERCEL_ENV, etc.)

#### System Information
```bash
curl https://ditt-projekt.vercel.app/api/debug/info
```

Visar:
- Node.js version
- Minnesanvändning
- CPU-användning
- Uptime

#### Database Status
```bash
curl https://ditt-projekt.vercel.app/api/debug/db-status
```

Testar databasanslutningen och visar responstid.

#### Senaste Loggarna
```bash
curl https://ditt-projekt.vercel.app/api/debug/logs?limit=100
```

Visar de senaste 100 loggmeddelanden.

**OBS:** I produktion måste du använda en debug-token:
```bash
curl -H "X-Debug-Token: DIN_HEMLIGA_TOKEN" https://ditt-projekt.vercel.app/api/debug/health
```

### 2. Vercel Dashboard Logging

#### Realtidsloggar i Vercel Dashboard
1. Gå till [Vercel Dashboard](https://vercel.com/dashboard)
2. Välj ditt projekt
3. Klicka på "Logs" i sidomenyn
4. Se realtidsloggar från alla requests

**Tips:** Använd filter för att hitta specifika problem:
- Filter på "error" för att se alla fel
- Filter på specifika request IDs
- Filter på användar-ID eller specifika paths

#### Dela Loggar med Teamet
1. I Vercel Dashboard > Logs
2. Klicka på en logg-rad för att expandera den
3. Kopiera länken från adressfältet - den innehåller timestamp och filters
4. Dela länken med teamet - de kan se exakt samma logg

### 3. Strukturerad Logging

Alla requests loggas nu automatiskt med:
- **Request ID**: Unikt ID för varje request (finns i `X-Request-Id` header)
- **Timestamp**: ISO 8601 format
- **Method & Path**: HTTP-metod och URL
- **Duration**: Hur lång tid requesten tog
- **Status Code**: HTTP-statuskod
- **User ID**: Om användaren är inloggad

#### Hitta en specifik request
1. Be användaren öppna Developer Tools (F12)
2. Gå till Network-fliken
3. Hitta den problematiska requesten
4. Kopiera värdet från `X-Request-Id` headern
5. Sök i Vercel Dashboard logs efter detta ID

```bash
# Eller via API
curl https://ditt-projekt.vercel.app/api/debug/logs | grep "REQUEST_ID_HÄR"
```

## 🔧 Avancerad Debugging

### Environment Variables i Vercel

För att aktivera debug-endpoints i produktion:

1. Gå till Vercel Dashboard > Settings > Environment Variables
2. Lägg till:
   - `DEBUG_TOKEN`: En hemlig token för debug-access
   - `LOG_LEVEL`: `info` eller `debug` beroende på hur detaljerade loggar du vill ha
   - `ENABLE_LOG_CAPTURE`: `true` för att aktivera log capture endpoint

3. Redeploya projektet

### Testa Error Tracking

För att testa att error tracking fungerar:

```bash
# Development
curl http://localhost:5000/api/debug/test-error?type=sync

# Production (med debug token)
curl -H "X-Debug-Token: YOUR_TOKEN" https://ditt-projekt.vercel.app/api/debug/test-error?type=sync
```

Error types:
- `sync`: Synkront fel
- `async`: Asynkront fel
- `unhandled`: Ohanterat fel

### Source Maps

Source maps är nu aktiverade i produktion! Detta betyder att stack traces visar:
- ✅ Riktiga filnamn (inte bundle.js)
- ✅ Riktiga radnummer från din källkod
- ✅ Variabelnamn (inte minifierade)

## 📊 Monitoring-Setup (Rekommenderas)

För än mer kraftfull debugging, rekommenderar jag att installera Sentry:

### Installation av Sentry

1. Skapa konto på [sentry.io](https://sentry.io)

2. Installera Sentry:
```bash
cd ordflyt-main
npm install @sentry/node @sentry/profiling-node
```

3. Skapa `server/sentry.ts`:
```typescript
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  }
}

export { Sentry };
```

4. Uppdatera `server/app.ts`:
```typescript
import { initSentry, Sentry } from './sentry';

// I början av getApp()
initSentry();

// Lägg till Sentry request handler efter requestLogger
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Lägg till Sentry error handler innan din error handler
app.use(Sentry.Handlers.errorHandler());
```

5. Lägg till Sentry DSN i Vercel Environment Variables:
   - `SENTRY_DSN`: Din Sentry DSN från sentry.io

### Fördelar med Sentry
- 📧 Email-notifikationer vid fel
- 🔍 Detaljerad stack traces med source maps
- 👥 Länkbara fel-rapporter för teamet
- 📈 Felstatistik och trends
- 🎯 Breadcrumbs (händelser innan felet)

## 🚀 Debugging Workflow

### Typiskt Problem-Scenario

**Problem:** Användare rapporterar att något inte fungerar

#### Steg 1: Samla Information
Be användaren om:
- Exakt tid när problemet inträffade
- Vilken sida/feature (URL)
- Vad de försökte göra

#### Steg 2: Hitta Request ID
```bash
# Alternativ A: Be användaren kolla Network tab (F12) och kopiera X-Request-Id

# Alternativ B: Sök i loggar baserat på tid och path
curl https://ditt-projekt.vercel.app/api/debug/logs?limit=200 | \
  grep "2024-10-21T10:30"
```

#### Steg 3: Analysera i Vercel Dashboard
1. Öppna Vercel Dashboard > Logs
2. Filtrera på Request ID eller tidpunkt
3. Se alla loggar relaterade till den requesten
4. Kopiera länken och dela med teamet

#### Steg 4: Inspektera System State
```bash
# Kolla systemstatus
curl -H "X-Debug-Token: YOUR_TOKEN" https://ditt-projekt.vercel.app/api/debug/health

# Kolla databas
curl -H "X-Debug-Token: YOUR_TOKEN" https://ditt-projekt.vercel.app/api/debug/db-status
```

#### Steg 5: Reproducera & Fixa
- Om du kan reproducera, använd development environment
- Om inte, lägg till mer logging i relevant kod
- Deploy och invänta nästa occurrence

## 💡 Best Practices

### 1. Logga Strategiskt
```typescript
import { logger } from './logger';

// ✅ Bra: Strukturerad logging med kontext
logger.info('User created order', {
  userId: user.id,
  orderId: order.id,
  amount: order.total
});

// ❌ Dåligt: Ostrukturerad logging
console.log('Order created');
```

### 2. Använd Request Context
```typescript
// I en route handler
export async function handleOrder(req: Request, res: Response) {
  const requestLogger = logger.child({ 
    requestId: req.requestId,
    userId: req.user?.id 
  });
  
  requestLogger.info('Processing order');
  // Alla logs från denna logger kommer ha requestId och userId
}
```

### 3. Logga Errors Ordentligt
```typescript
try {
  await someOperation();
} catch (error) {
  logger.error('Failed to process order', {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    orderId: order.id,
    userId: user.id
  });
  throw error;
}
```

### 4. Använd Debug-Endpoints under Development
```typescript
// Under lokal utveckling, testa dina endpoints
const response = await fetch('http://localhost:5000/api/debug/health');
console.log(await response.json());
```

## 🔐 Säkerhet

### Debug-Endpoints i Produktion
Debug-endpoints är **skyddade** i produktion:
- Kräver `X-Debug-Token` header
- Token sätts via Vercel Environment Variables
- Generera en stark token: `openssl rand -hex 32`

### Känslig Data i Loggar
**Logga ALDRIG:**
- Lösenord
- API-nycklar
- Personlig information (GDPR)
- Sessionstoken
- Kreditkortsinformation

```typescript
// ❌ DÅLIGT
logger.info('User login', { password: req.body.password });

// ✅ BRA
logger.info('User login attempt', { 
  username: req.body.username,
  success: true 
});
```

## 📞 Support

Om du behöver hjälp med debugging:
1. Samla information från debug-endpoints
2. Hämta relevanta loggar från Vercel
3. Inkludera Request IDs när möjligt
4. Dela Vercel log-länkar (inte copy-paste)

## 🎉 Fördelar med Nya Systemet

### Före
- ❌ Manuellt kopiera loggar från Vercel
- ❌ Svårt att hitta specifika requests
- ❌ Kan inte inspektera live system
- ❌ Svårt att dela fel med teamet

### Efter
- ✅ Automatisk strukturerad logging
- ✅ Sökbara Request IDs
- ✅ Live systeminspektion via API
- ✅ Delbara log-länkar
- ✅ Source maps för läsbara stack traces
- ✅ JSON-format för enkel parsing




