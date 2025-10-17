# ⚡ Snabbfix: Admin-inloggning fungerar inte (VERCEL)

## 🎯 Vad du behöver göra NU

### 1. Sätt ADMIN_PASSWORD i Vercel

1. **Gå till Vercel Dashboard**: https://vercel.com/dashboard
2. **Välj ditt projekt** (ordflyt)
3. **Klicka på "Settings"**
4. **Välj "Environment Variables"** i vänstermenyn
5. **Lägg till en ny environment variable:**
   - **Key**: `ADMIN_PASSWORD`
   - **Value**: Välj ett starkt lösenord (t.ex. `MySecure2024!Admin`)
   - **Environments**: Bocka i alla (Production, Preview, Development)
6. **Klicka "Save"**

### 2. Redeploya

Du har två alternativ:

**Alternativ A - Automatisk (rekommenderas):**
1. Gå till **Deployments** tab i Vercel
2. Hitta senaste deployment
3. Klicka på **"..."** (tre prickar)
4. Välj **"Redeploy"**
5. Vänta tills deployment är klar

**Alternativ B - Via GitHub push:**
1. Gör en liten ändring i koden
2. Committa och pusha till GitHub
3. Vercel deployer automatiskt

### 3. Logga in

Gå till din Vercel URL och logga in med:
- **Användarnamn**: `admin`
- **Lösenord**: Det lösenord du satte i steg 1

## ✅ Det fixar det automatiskt!

Den nya koden gör nu följande:

- ✅ Skapar admin-användaren om den inte finns
- ✅ Uppdaterar lösenordet om det är fel
- ✅ Visar tydliga felmeddelanden i loggarna
- ✅ Ger dig exakta instruktioner om vad som är fel

## 📋 Om det fortfarande inte fungerar

### Kontrollera Vercel Logs:

1. Gå till **Vercel Dashboard** → ditt projekt
2. Klicka på **"Deployments"**
3. Välj senaste deployment
4. Klicka på **"View Function Logs"** eller **"Runtime Logs"**
5. Försök logga in igen
6. Sök efter meddelanden som börjar med:
   - `❌ CRITICAL:`
   - `🔐 Admin login attempt:`
   - `🔐 PRODUCTION LOGIN DEBUG:`

Loggarna visar exakt vad som är fel!

### Vanliga Vercel-problem:

| Problem | Lösning |
|---------|---------|
| Environment variable syns inte | Se till att du bockat i "Production" när du lade till den |
| Ändringen har ingen effekt | Gör en redeploy (se Steg 2 ovan) |
| "Function Logs" är tomma | Vänta några minuter och försök igen |

## 🔒 Säkerhet

**VIKTIGT:** Använd ett starkt lösenord!
- Minst 12 tecken
- Blanda stora/små bokstäver
- Inkludera siffror och symboler
- Använd INTE "admin", "password", "123456" etc.

Exempel på bra lösenord:
- `Ordflyt2024!Secure`
- `MyAdmin#Pass2024`
- `SuperSecret!42Admin`

---

Se **ADMIN_LOGIN_FIX.md** för mer detaljerad information och felsökning.

