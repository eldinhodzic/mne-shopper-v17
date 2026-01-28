# MNE Cjenovnik 🇲🇪

Aplikacija za praćenje cijena proizvoda u Crnoj Gori skeniranjem QR kodova sa fiskalnih računa.

## Funkcionalnosti

- 📷 **QR Scanner** - Skenirajte QR kodove sa fiskalnih računa
- 💾 **Lokalna pohrana** - Svi podaci se čuvaju na vašem uređaju (IndexedDB)
- 📊 **Praćenje cijena** - Pratite promjene cijena proizvoda tokom vremena
- 📱 **PWA** - Instalirajte kao aplikaciju na vašem telefonu
- 🔒 **Privatnost** - Podaci nikada ne napuštaju vaš uređaj

## Deployment na Vercel

### 1. Napravite GitHub repozitorijum

```bash
# Klonirajte ili napravite novi repo
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VAŠE_KORISNIČKO_IME/mne-cjenovnik.git
git push -u origin main
```

### 2. Povežite sa Vercel

1. Idite na [vercel.com](https://vercel.com)
2. Kliknite "Add New Project"
3. Importujte vaš GitHub repozitorijum
4. Framework Preset: **Vite**
5. Kliknite "Deploy"

### 3. Gotovo! 🎉

Vaša aplikacija će biti dostupna na `https://vaš-projekat.vercel.app`

## Lokalni razvoj

```bash
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
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Dexie.js** - IndexedDB wrapper
- **html5-qrcode** - QR scanning
- **vite-plugin-pwa** - PWA support

## API

Aplikacija koristi javni API Poreske uprave Crne Gore za verifikaciju fiskalnih računa:

```
POST https://mapr.tax.gov.me/ic/api/verifyInvoice
```

## Licenca

MIT
