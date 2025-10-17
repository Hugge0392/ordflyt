# Vercel Deployment Guide

## Förberedelser

### 1. Skapa en PostgreSQL-databas
Du behöver en PostgreSQL-databas. Rekommenderade alternativ:
- **Neon** (https://neon.tech) - Gratis nivå tillgänglig, perfekt för Vercel
- **Supabase** (https://supabase.com) - Gratis nivå tillgänglig
- **Vercel Postgres** (https://vercel.com/storage/postgres) - Integrerat med Vercel

### 2. Generera säkra secrets
Använd följande för att generera starka hemliga nycklar:

```bash
# I terminalen:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kör detta kommando 2 gånger för att få:
- `SESSION_SECRET`
- `PASSWORD_PEPPER`

### 3. Skaffa Postmark API-nyckel (för e-post)
1. Skapa konto på https://postmarkapp.com
2. Skapa en Server och kopiera API Token
3. Verifiera din avsändar-email

## Environment Variables för Vercel

Gå till ditt Vercel-projekt → Settings → Environment Variables och lägg till följande:

### Obligatoriska variabler:

| Variabel | Värde | Beskrivning |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `SESSION_SECRET` | `<random-32-byte-hex>` | För session-säkerhet |
| `PASSWORD_PEPPER` | `<random-32-byte-hex>` | För lösenords-hashing |
| `ADMIN_PASSWORD` | `<ditt-admin-lösenord>` | Lösenord för admin-konto |
| `BLOB_READ_WRITE_TOKEN` | Auto-sätts av Vercel | För bilduppladdning (se Blob Storage setup) |
| `POSTMARK_API_TOKEN` | `<din-postmark-token>` | För att skicka e-post |
| `FROM_EMAIL` | `noreply@dindomän.se` | Avsändar-email |
| `FRONTEND_URL` | `https://dindomän.vercel.app` | Din Vercel-URL |

### Valfria variabler:

| Variabel | Värde | Beskrivning |
|----------|-------|-------------|
| `AZURE_SPEECH_KEY` | `<azure-key>` | För text-till-tal (valfritt) |
| `AZURE_SPEECH_REGION` | `northeurope` | Azure region (valfritt) |

## Deployment-steg

### 1. Pusha till GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Importera till Vercel
1. Gå till https://vercel.com/new
2. Välj ditt GitHub repository
3. Konfigurera bygginställningar:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Lägg till Environment Variables
- Klicka på "Environment Variables"
- Lägg till alla variabler från tabellen ovan
- Se till att de är tillgängliga för alla environments (Production, Preview, Development)

### 4. Deploy
- Klicka på "Deploy"
- Vänta tills deployment är klar

## Efter deployment

### 1. Sätt upp Vercel Blob Storage (för bilduppladdning)

**VIKTIGT:** För att kunna ladda upp bilder i bloggskaparverktyget måste du aktivera Vercel Blob Storage!

1. Gå till ditt projekt i Vercel Dashboard
2. Klicka på **"Storage"** tab
3. Klicka **"Create Database"** → välj **"Blob"**
4. Klicka **"Continue"** och sedan **"Create"**
5. Klicka på din nya Blob store
6. Gå till **"Connect Project"** tab
7. Välj ditt projekt (ordflyt) och klicka **"Connect"**

Detta kommer automatiskt lägga till `BLOB_READ_WRITE_TOKEN` environment variable!

**Se `VERCEL_BLOB_SETUP.md` för detaljerad guide.**

### 2. Kör databasmigrationer
Efter första deployment, kör från din dator:
```bash
# Sätt DATABASE_URL från Vercel
$env:DATABASE_URL="<din-production-database-url>"

# Kör migrationen
npm run db:push
```

Detta skapar alla databastabeller.

### 3. Testa applikationen
1. Besök din Vercel-URL
2. Logga in med admin-kontot (användarnamn: `admin`, lösenord: `ADMIN_PASSWORD` från env vars)
3. Verifiera att allt fungerar
4. **Testa bilduppladdning** i bloggskaparverktyget

### 4. Konfigurera domän (valfritt)
I Vercel:
1. Gå till Settings → Domains
2. Lägg till din egen domän
3. Uppdatera `FRONTEND_URL` environment variable till din nya domän

## Felsökning

### Problem med databas
- Kontrollera att `DATABASE_URL` är korrekt
- Verifiera att databasen är tillgänglig från internet
- Kör `npm run db:push` för att skapa tabeller

### Problem med e-post
- Kontrollera att `POSTMARK_API_TOKEN` är korrekt
- Verifiera att `FROM_EMAIL` är godkänd i Postmark

### Build-fel
- Kontrollera build logs i Vercel dashboard
- Se till att alla dependencies finns i `package.json`

## Säkerhet

✅ **Viktigt:**
- Använd alltid starka, unika värden för `SESSION_SECRET` och `PASSWORD_PEPPER`
- Dela ALDRIG dina environment variables publikt
- Aktivera Vercel's "Deployment Protection" för extra säkerhet
- Använd "Preview Deployments" för att testa ändringar innan production

## Support

För hjälp med Vercel-specifika frågor:
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
