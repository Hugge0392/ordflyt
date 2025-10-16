# 🚀 Migrering från Replit till Vercel

## Varför migrera?
- ✅ **Automatisk deployment** - Varje push till GitHub deployas automatiskt
- ✅ **Snabbare performance** - Bättre hosting infrastructure
- ✅ **Enklare workflow** - Ingen manuell deploy-knapp
- ✅ **Gratis för hobby projects**
- ✅ **Bättre Git-integration**

## Steg-för-steg migrering

### 1️⃣ Förberedelser (KLART ✅)

Följande är redan klart:
- ✅ `vercel.json` - Vercel konfiguration
- ✅ `.vercelignore` - Ignorera onödiga filer
- ✅ Production build fungerar (`npm run build`)
- ✅ Kod är pushad till GitHub

### 2️⃣ Skapa Vercel-konto och koppla GitHub

1. Gå till [vercel.com](https://vercel.com)
2. Klicka "Sign Up"
3. Välj "Continue with GitHub"
4. Godkänn att Vercel får tillgång till dina repos

### 3️⃣ Importera projekt till Vercel

1. När du är inloggad, klicka **"Add New..."** → **"Project"**
2. Hitta ditt repo: **`Hugge0392/ordflyt`**
3. Klicka **"Import"**

### 4️⃣ Konfigurera projekt

**Framework Preset:** None (Custom)

**Build & Development Settings:**
- **Build Command:** `npm run build`
- **Output Directory:** `dist/public`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

**Root Directory:** `.` (lämna som standard)

### 5️⃣ Lägg till miljövariabler

Klicka på **"Environment Variables"** och lägg till följande:

#### 🔐 KRITISKA (Måste finnas):

```bash
# Databas
DATABASE_URL=<Din Neon/PostgreSQL connection string>

# Session säkerhet
SESSION_SECRET=<Generera en lång random string, minst 32 tecken>
PASSWORD_PEPPER=<Din nuvarande pepper från Replit>

# Email (Postmark)
POSTMARK_API_TOKEN=<Din Postmark API token>
FROM_EMAIL=<Din avsändar-email, t.ex. noreply@ordflyt.se>

# Node miljö
NODE_ENV=production
```

#### 🎨 VALFRIA (Men rekommenderade):

```bash
# Azure Speech (om du använder text-to-speech)
AZURE_SPEECH_KEY=<Din Azure API key>
AZURE_SPEECH_REGION=<t.ex. northeurope>

# Admin
ADMIN_PASSWORD=<Ett säkert admin-lösenord>

# Frontend URL (för CORS och redirects)
FRONTEND_URL=https://ordflyt.vercel.app
```

**💡 Tips för att hitta dina nuvarande värden:**
- Gå till Replit → Ditt projekt → Secrets tab
- Kopiera värdena därifrån

#### 🔑 Generera säkra secrets:

```bash
# Generera SESSION_SECRET (kör i terminal):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Om du inte har PASSWORD_PEPPER, generera en:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6️⃣ Deploya!

1. När alla miljövariabler är tillagda, klicka **"Deploy"**
2. Vänta 2-3 minuter medan Vercel bygger och deployer
3. När det är klart får du en URL: `https://ordflyt.vercel.app` (eller liknande)

### 7️⃣ Konfigurera custom domän (ordflyt.se)

1. I Vercel project settings, gå till **"Domains"**
2. Klicka **"Add"**
3. Skriv `ordflyt.se`
4. Vercel ger dig DNS-instruktioner
5. Gå till din domänleverantör (där du köpte ordflyt.se)
6. Uppdatera DNS records enligt Vercel's instruktioner:
   ```
   A Record:    @ → 76.76.21.21
   CNAME:       www → cname.vercel-dns.com
   ```
7. Vänta 5-60 minuter för DNS-propagering

### 8️⃣ Testa deployment

När deploymenten är klar:

1. **Testa elevlogin:**
   - Gå till din Vercel URL
   - Logga in som elev (username: `elev`, password: `elev`)
   - Verifiera att du kommer till `/elev` och inte får 401-fel

2. **Testa lärarlogin:**
   - Logga in som lärare (username: `larare`, password: `larare`)
   - Gå till lärar-dashboard
   - Verifiera att klasser laddas snabbt (tack vare vår N+1 fix!)

3. **Testa databasanslutning:**
   - Skapa en ny elev
   - Verifiera att data sparas korrekt

## 🔄 Automatisk deployment framöver

När migreringen är klar fungerar det så här:

1. **Du gör ändringar lokalt** (med Claude Code, VSCode, Cursor etc.)
2. **Committa ändringarna:** `git add . && git commit -m "Fix bug"`
3. **Pusha till GitHub:** `git push`
4. **Vercel deployer AUTOMATISKT** 🎉
5. **Live på 1-2 minuter!**

## 📊 Monitorering och loggar

**Se deployment status:**
- Gå till [vercel.com](https://vercel.com) → Ditt projekt → "Deployments"

**Se live logs:**
- Deployment tab → Klicka på en deployment → "Logs"
- Eller använd Vercel CLI: `vercel logs ordflyt`

## 🐛 Troubleshooting

### Problem: Build misslyckas
**Lösning:** Kolla build logs i Vercel dashboard
- Vanligaste felet: Saknade miljövariabler
- Verifiera att alla `process.env.*` finns i Environment Variables

### Problem: 500-fel efter deployment
**Lösning:** Kolla runtime logs
- Gå till Vercel dashboard → Ditt projekt → Logs
- Leta efter error messages
- Vanligast: DATABASE_URL är fel eller databas är nere

### Problem: Databas connection timeout
**Lösning:** Vercel använder serverless functions
- Din Neon database måste tillåta connections från Vercel's IP-ranges
- Eller använd connection pooling (vi använder redan `@neondatabase/serverless`)

### Problem: Sidan laddas inte
**Lösning:** Kolla routes i `vercel.json`
- Verifiera att alla routes pekar rätt
- Test med: `https://your-url.vercel.app/api/auth/me`

## 🎯 Nästa steg efter migration

1. **Uppdatera alla länkar:**
   - Ändra hardkodade URLs från Replit till din nya Vercel URL
   - Uppdatera FRONTEND_URL environment variable

2. **Sätt upp GitHub Actions (valfritt):**
   - Automatiska tester innan deployment
   - Slack-notifikationer för deployments

3. **Aktivera Vercel Analytics (valfritt):**
   - Gratis basic analytics
   - Se hur många som besöker din site

4. **Konfigurera Preview Deployments:**
   - Vercel skapar automatiskt preview URLs för varje PR
   - Testa ändringar innan de går live!

## ✅ Checklista innan du stänger av Replit

- [ ] Vercel deployment fungerar
- [ ] Elevlogin fungerar
- [ ] Lärarlogin fungerar
- [ ] Databas-connection fungerar
- [ ] Email-utskick fungerar (testa med "Glömt lösenord")
- [ ] Custom domän (ordflyt.se) pekar på Vercel
- [ ] DNS har propagerat (kan ta upp till 48h)
- [ ] Alla team members har tillgång till Vercel-projektet

## 🚨 Rollback-plan

Om något går fel:
1. Gå till Vercel dashboard → Deployments
2. Hitta en fungerande tidigare deployment
3. Klicka "..." → "Promote to Production"
4. Eller aktivera Replit igen temporärt medan du fixar problemet

## 💰 Kostnad

**Vercel Free Tier** (perfekt för dig):
- ✅ 100 GB bandwidth/månad
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Preview deployments

**När du växer:**
- Pro: $20/månad per team member (om du behöver mer bandwidth)

## 📞 Support

**Om du kör fast:**
1. Kolla Vercel docs: [vercel.com/docs](https://vercel.com/docs)
2. Vercel Discord: [discord.gg/vercel](https://discord.gg/vercel)
3. Eller fråga mig (Claude) igen! 😊

---

## 🎉 Lycka till med migreringen!

Efter detta är klart har du en modern, professionell deployment-pipeline. Varje gång du pushar till GitHub deployas automatiskt - inget mer krångel med Replit's deploy-knapp!
