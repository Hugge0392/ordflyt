# 🎨 Vercel Blob Storage Setup Guide

## Vad är Vercel Blob Storage?

Vercel Blob Storage är en fil-lagrings-tjänst som låter dig ladda upp och lagra bilder, dokument och andra filer. Det fungerar perfekt med din Vercel-deployment!

## 💰 Kostnad

- **Lagring**: ~$0.15 per GB/månad
- **Bandbredd**: ~$0.30 per GB
- **Gratis tier**: Första 1GB lagring och 1GB bandbredd per månad är gratis

**Exempel:** Om du har 100 bilder (~50MB totalt) och de visas 1000 gånger/månad (~50MB bandbredd) = **Gratis!** ✅

## 🚀 Setup Steg-för-steg

### Steg 1: Aktivera Vercel Blob Storage

1. **Gå till Vercel Dashboard**: https://vercel.com/dashboard
2. **Välj ditt projekt** (ordflyt)
3. **Klicka på "Storage"** tab (i top-menyn)
4. **Klicka "Create Database"**
5. **Välj "Blob"**
6. **Klicka "Continue"**
7. **Bekräfta** med "Create"

### Steg 2: Anslut Blob Storage till ditt projekt

1. Efter att ha skapat Blob Storage, kommer du se en lista över dina stores
2. **Klicka på din Blob store**
3. **Klicka på "Connect Project"** tab
4. **Välj ditt projekt** (ordflyt)
5. **Klicka "Connect"**

Detta kommer **automatiskt** lägga till environment variable `BLOB_READ_WRITE_TOKEN` till ditt projekt!

### Steg 3: Installera dependencies

På din **lokala dator**, i projekt-mappen:

```bash
cd C:\Users\hugod\OneDrive\ordflyt-main\ordflyt-main
npm install
```

Detta kommer installera `@vercel/blob` paketet som redan är tillagt i `package.json`.

### Steg 4: Pusha till GitHub

```bash
git add .
git commit -m "Add Vercel Blob Storage support for image uploads"
git push
```

Vercel kommer automatiskt deploya den nya versionen!

### Steg 5: Testa bilduppladdning

1. **Gå till din Vercel-sida**
2. **Logga in som admin**
3. **Gå till blogg-skaparverktyget**
4. **Försök ladda upp en bild**

Det borde fungera nu! 🎉

## 🔍 Kontrollera att det fungerar

### Kolla Function Logs

1. **Gå till Vercel Dashboard** → ditt projekt
2. **Klicka "Deployments"**
3. **Välj senaste deployment**
4. **Klicka "View Function Logs"**
5. **Ladda upp en bild** på din sida
6. **Leta efter:**
   ```
   Uploading to Vercel Blob: [filename]
   Vercel Blob upload successful, URL: https://...
   ```

Om du ser detta betyder det att Vercel Blob fungerar! ✅

### Kolla dina uppladdade filer

1. **Gå till Vercel Dashboard** → ditt projekt
2. **Klicka "Storage"** tab
3. **Välj din Blob store**
4. **Klicka "Browser"** tab
5. Du bör se alla bilder du laddat upp!

## 🐛 Felsökning

### Problem: "BLOB_READ_WRITE_TOKEN is not defined"

**Lösning:**
1. Gå till **Storage** tab i Vercel
2. Klicka på din Blob store
3. Gå till **"Connect Project"** tab
4. Se till att ditt projekt (ordflyt) är connectat
5. Om den redan är connectad, disconnecta och connecta igen
6. Redeploya: Deployments → ... → Redeploy

### Problem: "Upload failed: 401"

**Lösning:**
1. `BLOB_READ_WRITE_TOKEN` är inte rätt satt
2. Gå till **Settings → Environment Variables**
3. Leta efter `BLOB_READ_WRITE_TOKEN`
4. Den ska vara satt för **Production** environment
5. Redeploya

### Problem: Bilduppladdning fungerar i utveckling men inte i produktion

**Lösning:**
1. Se till att du pushat koden till GitHub
2. Se till att Vercel har deployat den nya versionen
3. Kolla Function Logs för felmeddelanden

### Problem: "No storage backend configured"

**Lösning:**
Detta betyder att koden inte vet vilken miljö den körs i.

1. Gå till **Settings → Environment Variables**
2. Se till att `NODE_ENV=production` finns
3. Eller lägg till `VERCEL=1` environment variable
4. Redeploya

## 💡 Teknisk information

### Hur fungerar det?

- **I utveckling (lokalt)**: Bilder sparas i `uploads/` mapp på din dator
- **På Vercel**: Bilder sparas i Vercel Blob Storage (CDN)
- **På Replit**: Bilder sparas i Replit Object Storage

Koden detekterar automatiskt vilken miljö den körs i och använder rätt storage!

### Var lagras bilderna?

När du laddar upp en bild på Vercel:
1. Bilden skickas till `/api/upload-direct`
2. Servern laddar upp till Vercel Blob Storage
3. Vercel returnerar en URL som: `https://[random-id].public.blob.vercel-storage.com/[filename]`
4. Denna URL sparas i databasen
5. När någon besöker sidan, laddas bilden direkt från Vercel's CDN (supersnabbt!)

### Säkerhet

- Uppladdningar kräver inloggning (`requireAuth`)
- CSRF-skydd aktiverat (`requireCsrf`)
- Max filstorlek: 10MB
- Alla filer är **publika** (vilket är OK för blogginlägg)

## 📊 Övervaka användning

För att se hur mycket lagring och bandbredd du använder:

1. **Gå till Vercel Dashboard**
2. **Välj ditt projekt**
3. **Klicka "Storage"** tab
4. **Välj din Blob store**
5. **Klicka "Usage"** tab

Här ser du:
- Total storlek på alla filer
- Antal requests
- Bandbredd använd
- Kostnad för månaden

## 🎯 Best practices

### Optimera bilder innan uppladdning

Koden komprimerar automatiskt bilder till max 2MB och 1920px bredd när du laddar upp via rich text editor!

### Ta bort gamla bilder

För närvarande finns ingen automatisk cleanup. Om du vill ta bort gamla bilder:

1. Gå till **Storage** → din Blob store → **"Browser"** tab
2. Hitta filen du vill ta bort
3. Klicka på den och välj **"Delete"**

**Tips:** Radera inte filer som fortfarande används i publicerade blogginlägg!

## ✅ Sammanfattning

Efter att ha följt denna guide:
- ✅ Vercel Blob Storage är aktiverat
- ✅ Ditt projekt är anslutet
- ✅ Environment variables är satta
- ✅ Koden är uppdaterad och deployad
- ✅ Bilduppladdning fungerar!

Nu kan du ladda upp bilder i bloggskaparverktyget! 🎉

---

## 📞 Support

Om något inte fungerar:
1. Kolla Function Logs i Vercel
2. Kolla att `BLOB_READ_WRITE_TOKEN` är satt
3. Se till att Blob store är connectad till projektet
4. Försök disconnecta och connecta igen
5. Redeploya applikationen

Lycka till! 🚀


