# Lägg till category-kolumn i blog_posts

## Problem
Kategori-väljaren i admin sparar inte kategorin eftersom `category`-kolumnen inte finns i databasen.

## Lösning
Kör database migration för att lägga till kolumnen.

---

## Steg 1: Lokal migration (Test först!)

```bash
cd ordflyt-main
npm run db:push
```

Detta lägger till `category`-kolumnen lokalt.

---

## Steg 2: Produktionsmigration (Vercel)

**Kör samma migration mot produktion:**

```bash
cd ordflyt-main
set DATABASE_URL=postgresql://neondb_owner:npg_xxxxxxxxxx@ep-xxxxxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
npm run db:push
```

*(Ersätt med din riktiga DATABASE_URL från Vercel → Settings → Environment Variables)*

---

## Steg 3: Verifiera

1. Gå till Admin → Blogg
2. Redigera ett inlägg
3. Ändra kategorin till "Läsförståelse"
4. Spara
5. Öppna igen - kategorin ska fortfarande vara "Läsförståelse" ✅

---

## Vad händer?

Migration lägger till:
```sql
ALTER TABLE blog_posts 
ADD COLUMN category VARCHAR(50) DEFAULT 'allmant';
```

Alla befintliga inlägg får automatiskt `category = 'allmant'`.


