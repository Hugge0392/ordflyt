# 🚀 Debugging Quickstart

## Snabbguide för effektivare debugging på Vercel

### 📋 Steg 1: Sätt upp Debug Token (Produktion)

1. Öppna [Vercel Dashboard](https://vercel.com/dashboard)
2. Välj ditt projekt
3. Gå till **Settings > Environment Variables**
4. Lägg till:
   ```
   DEBUG_TOKEN = [generera en stark token]
   LOG_LEVEL = info
   ```
5. Redeploya projektet

**Generera token:**
```bash
# På Mac/Linux
openssl rand -hex 32

# På Windows PowerShell
[Convert]::ToBase64String((1..32|ForEach-Object{Get-Random -Minimum 0 -Maximum 256}))
```

### 🔍 Steg 2: Använd Debug-Endpoints

#### Lokal utveckling (ingen token krävs):
```bash
curl http://localhost:5000/api/debug/health
```

#### Produktion (med token):
```bash
curl -H "X-Debug-Token: DIN_TOKEN" https://ditt-projekt.vercel.app/api/debug/health
```

### 📊 Tillgängliga Endpoints

| Endpoint | Vad den visar |
|----------|---------------|
| `/api/debug/health` | Systemstatus & databas |
| `/api/debug/info` | Server-info & miljö |
| `/api/debug/db-status` | Databas-anslutning |
| `/api/debug/logs?limit=100` | Senaste loggarna |
| `/api/debug/test-error?type=sync` | Testa error tracking |

### 🔎 Steg 3: Hitta Fel i Vercel Dashboard

När något går fel:

1. **Gå till Vercel Dashboard > Logs**
2. **Använd filters:**
   - Sök på "error" för alla fel
   - Sök på specifik path (t.ex. "/api/users")
   - Sök på Request ID (från Network tab)
3. **Klicka på en logg** för att se full kontext
4. **Kopiera URL:en** och dela med teamet

### 💡 Hitta Request ID

När en användare rapporterar ett fel:

1. Be dem öppna Developer Tools (F12)
2. Gå till **Network**-fliken
3. Hitta den problematiska requesten
4. Klicka på den och gå till **Headers**
5. Kopiera värdet från `X-Request-Id`
6. Sök på detta ID i Vercel Dashboard

### 🎯 Typiskt Debugging-Workflow

```
Problem rapporterat
    ↓
Samla info (tid, URL, vad användaren gjorde)
    ↓
Hitta Request ID (från Network tab eller Vercel logs)
    ↓
Sök i Vercel Dashboard med Request ID
    ↓
Analysera loggar och kontext
    ↓
Om oklart: Kolla /api/debug/health & /api/debug/db-status
    ↓
Fixa problemet
    ↓
Redeploya
```

### 🧪 Testa Systemet

```bash
# På Mac/Linux
chmod +x test-debug-system.sh
./test-debug-system.sh

# På Windows PowerShell
.\test-debug-system.ps1

# För att testa produktion
.\test-debug-system.ps1 -BaseUrl "https://ditt-projekt.vercel.app"
```

### 📈 Optional: Lägg till Sentry (Rekommenderas)

För än bättre error tracking:

```bash
npm install @sentry/node @sentry/profiling-node
```

Lägg till i Vercel Environment Variables:
```
SENTRY_DSN = [din DSN från sentry.io]
```

Se [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) för fullständig guide.

### 🎉 Fördelar

**Innan:**
- 😓 Manuellt kopiera loggar från Vercel
- 😓 Svårt att hitta rätt request
- 😓 Kan inte inspektera systemet live

**Nu:**
- ✅ Sökbara Request IDs i alla loggar
- ✅ Live system-inspektion via API
- ✅ Delbara log-länkar från Vercel
- ✅ Source maps = läsbara stack traces
- ✅ Strukturerad JSON-logging

### 🆘 Hjälp Behövs?

Se den fullständiga guiden: [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)

