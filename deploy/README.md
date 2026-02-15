# MNE Cjenovnik 🇲🇪

Aplikacija za praćenje cijena proizvoda u Crnoj Gori skeniranjem QR kodova sa fiskalnih računa.

## Funkcionalnosti

- 📷 **QR Scanner** - Skenirajte QR kodove sa fiskalnih računa
- 💾 **Lokalna pohrana** - Svi podaci se čuvaju na vašem uređaju (IndexedDB)
- 🌍 **Community** - Dijelite i uporedite cijene sa zajednicom (Supabase)
- 📊 **Praćenje cijena** - Pratite promjene cijena proizvoda tokom vremena
- 🛒 **Shopping lista** - Kreirajte liste za kupovinu
- 📱 **PWA** - Instalirajte kao aplikaciju na vašem telefonu
- 🌐 **Višejezično** - ME / EN / RU / DE

## Deployment na Vercel

### 1. Napravite GitHub repozitorijum

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mne-cjenovnik.git
git push -u origin main
```

### 2. Povežite sa Vercel

1. Idite na [vercel.com](https://vercel.com)
2. Kliknite **"Add New Project"**
3. Importujte vaš GitHub repozitorijum
4. Framework Preset: **Vite**
5. Dodajte Environment Variables:
   - `VITE_SUPABASE_URL` → vaš Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → vaš Supabase anon key
6. Kliknite **"Deploy"**

### 3. Gotovo! 🎉

Vaša aplikacija će biti dostupna na `https://vaš-projekat.vercel.app`

> **Napomena:** Environment varijable su opcione — aplikacija ima fallback vrijednosti za razvoj. Za produkciju preporučljivo je koristiti env vars u Vercel dashboard-u.

## Lokalni razvoj

```bash
# Kopirajte env primjer
cp .env.example .env
# Uredite .env sa vašim Supabase kredencijalima

# Instalirajte dependencies
npm install

# Pokrenite development server
npm run dev

# Build za produkciju
npm run build

# Preview produkcijskog builda
npm run preview
```

## Tehnologije

- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS** - Styling
- **Dexie.js** - IndexedDB wrapper (lokalna pohrana)
- **Supabase** - Community backend (dijeljene cijene)
- **html5-qrcode** - QR scanning
- **vite-plugin-pwa** - PWA / offline support

## Struktura projekta

```
├── public/              # Statički fajlovi (favicon, PWA ikone)
├── src/
│   ├── components/      # React komponente
│   ├── hooks/           # Custom hooks (useLanguage)
│   ├── lib/             # Utility moduli (API, DB, Supabase)
│   ├── locales/         # Prijevodi (ME, EN, RU, DE)
│   ├── App.jsx          # Glavna komponenta
│   ├── index.css        # Tailwind stilovi
│   └── main.jsx         # Entry point
├── vercel.json          # Vercel konfiguracija (SPA rewrites)
├── supabase-schema.sql  # Database schema
└── package.json
```

## API

Aplikacija koristi javni API Poreske uprave Crne Gore:

```
POST https://mapr.tax.gov.me/ic/api/verifyInvoice
```

## Licenca

MIT
