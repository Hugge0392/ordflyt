# 🔧 Åtgärda Admin-inloggning i Produktion (VERCEL)

## Problem
Admin-inloggning fungerar inte på den publicerade versionen i Vercel.

## Lösning

### Steg 1: Kontrollera Environment Variables i Vercel

1. **Gå till Vercel Dashboard**: https://vercel.com/dashboard
2. **Välj ditt projekt** (ordflyt)
3. **Klicka på "Settings"**
4. **Välj "Environment Variables"**
5. **Leta efter `ADMIN_PASSWORD`**
   - Om den INTE finns: Fortsätt till Steg 2
   - Om den finns: Kontrollera att du kommer ihåg lösenordet

### Steg 2: Lägg till eller uppdatera ADMIN_PASSWORD

1. I **Environment Variables**, klicka **"Add New"** (eller **"Edit"** om den finns)
2. **Key**: `ADMIN_PASSWORD`
3. **Value**: Välj ett starkt lösenord (minst 12 tecken)
   - Exempel: `MySecure2024!Admin`
4. **Environments**: ✅ Bocka i **Production** (och gärna Preview/Development också)
5. **Klicka "Save"**

### Steg 3: Redeploya applikationen

Efter att du har lagt till/uppdaterat `ADMIN_PASSWORD`:

**Metod 1 - Direkt Redeploy (snabbast):**
1. Gå till **"Deployments"** tab
2. Hitta senaste deployment
3. Klicka **"..."** → **"Redeploy"**
4. Bekräfta och vänta tills deployment är klar

**Metod 2 - Via Git push:**
1. Gör en liten ändring i koden (t.ex. lägg till en kommentar)
2. Committa och pusha till GitHub
3. Vercel deployer automatiskt

### Steg 4: Logga in

1. **Gå till din Vercel URL** (t.ex. `https://ordflyt.vercel.app` eller din custom domain)
2. **Logga in med:**
   - **Användarnamn**: `admin`
   - **Lösenord**: Det lösenord du satte i `ADMIN_PASSWORD`

## Hur det fungerar

Den förbättrade koden gör nu följande automatiskt:

✅ **Om admin-användaren inte finns**: Skapar den automatiskt vid första inloggningen  
✅ **Om admin-användaren har fel lösenord**: Uppdaterar lösenordet till `ADMIN_PASSWORD`  
✅ **Förbättrad loggning**: Server-loggarna visar exakt vad som händer vid inloggningsförsök  

## Felsökning

### Kontrollera Vercel Function Logs

1. **Gå till Vercel Dashboard** → ditt projekt
2. Klicka på **"Deployments"**
3. Välj din senaste **Production** deployment
4. Klicka på **"View Function Logs"** eller **"Runtime Logs"**
5. I en annan flik, försök logga in som admin
6. Gå tillbaka till logs och leta efter:
   - `🔐 PRODUCTION LOGIN DEBUG:`
   - `🔐 Admin login attempt:`
   - `❌ CRITICAL: ADMIN_PASSWORD environment variable is not set`

### Vanliga problem och lösningar

| Problem | Lösning |
|---------|---------|
| `ADMIN_PASSWORD environment variable is not set` | Lägg till `ADMIN_PASSWORD` i Environment Variables (Steg 2) |
| `Password does not match ADMIN_PASSWORD` | Du använder fel lösenord - använd exakt samma som i Vercel |
| Environment variable finns men syns inte | Säkerställ att "Production" är ibockad och redeploya |
| Ändringen har ingen effekt | Gör en manuell redeploy (se Steg 3) |
| "För många inloggningsförsök" | Vänta 15 minuter och försök igen |
| Logs är tomma | Vänta 1-2 minuter efter login-försök, eller kontrollera "Runtime Logs" |

### Vercel-specifika tips

**Kontrollera att Environment Variable är rätt satt:**
```
Settings → Environment Variables → ADMIN_PASSWORD
✅ Production (måste vara ibockad!)
✅ Preview (valfritt)
✅ Development (valfritt)
```

**Om du precis lagt till en Environment Variable:**
- Gamla deployments har INTE den nya variabeln
- Du MÅSTE redeploya för att den ska börja användas
- Varje redeploy läser in alla environment variables på nytt

### Nödlösning: Återställ admin-användaren via databas

Om inget annat fungerar:

1. **Öppna din databas-admin** (Neon/Supabase/Vercel Postgres)
2. **Hitta `users` tabellen**
3. **Ta bort raden där `username = 'admin'`**
4. **Redeploya i Vercel**
5. **Försök logga in** - admin skapas automatiskt om `ADMIN_PASSWORD` är satt

## Säkerhet

⚠️ **VIKTIGT:**
- Använd ALDRIG lösenord som "admin", "password", "123456" i produktion
- Dela ALDRIG `ADMIN_PASSWORD` publikt
- Byt lösenord regelbundet
- Använd ett unikt lösenord för varje miljö (utveckling vs produktion)

## Support

Om problemet kvarstår:
1. Kontrollera server-loggarna för felmeddelanden
2. Verifiera att databasen fungerar korrekt
3. Kontakta support med exakta felmeddelanden från loggarna

