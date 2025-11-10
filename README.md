# 🎓 Sistem Pendaftaran Siswa Baru (PSB)
## SMK Tahasus Plus Al Mardliyah

> Aplikasi web modern untuk mengelola pendaftaran siswa baru dengan fitur admin dashboard yang lengkap.

[![Status](https://img.shields.io/badge/status-production-brightgreen)]()
[![Version](https://img.shields.io/badge/version-2.0-blue)]()

---

## 📖 Tentang Aplikasi

Sistem PSB Online adalah aplikasi web lengkap untuk mengelola pendaftaran siswa baru di SMK Tahasus Plus Al Mardliyah. Aplikasi ini menyediakan form pendaftaran yang user-friendly untuk calon siswa dan dashboard admin yang powerful untuk mengelola data pendaftar.

### Fitur Utama

#### 🌐 **Landing Page (`index.html`)**
- Informasi program keahlian (TJKT, Kuliner, Tata Busana)
- Tampilan tahun ajaran dan gelombang aktif secara dinamis
- Design modern dan responsive
- Call-to-action langsung ke form pendaftaran

#### 📝 **Form Pendaftaran (`registrasi.html`)**
- Multi-step form (Data Pribadi, Data Orang Tua, Program Keahlian, Review)
- Auto-save ke localStorage (data tidak hilang saat browser ditutup)
- Validasi real-time (NIK, NISN, No. HP, Email, dll)
- Otomatis mengambil tahun ajaran dan gelombang aktif
- Generate nomor registrasi otomatis
- Mobile responsive
- **Tidak perlu login** - akses publik untuk calon siswa

#### 🔐 **Login Admin (`public/login.html`)**
- Autentikasi dengan **Supabase Auth**
- Login menggunakan email & password
- Session management otomatis
- Secure & production-ready
- Dark monochrome theme konsisten

#### 📊 **Dashboard Admin (`dashboard.html`)**
- **Protected** - hanya bisa diakses setelah login
- Tabel data pendaftar dengan pagination
- Filter otomatis berdasarkan gelombang aktif
- Filter manual per tahun pelajaran dan gelombang
- Search (nama, NISN, sekolah, nomor registrasi)
- Statistik real-time per program keahlian
- Bulk actions (hapus, update status)
- Export ke Excel dengan filter
- Detail view setiap pendaftar
- Update status (Pending, Approved, Rejected)
- Logout button & user info display
- Dark monochrome theme yang modern

#### ⚙️ **Settings (`settings.html`)**
- **Protected** - hanya bisa diakses setelah login
- Manajemen tahun pelajaran dan gelombang
- Tambah/edit/hapus gelombang pendaftaran
- Aktivasi/nonaktivasi gelombang
- Validasi duplikat dan format data
- Statistik gelombang aktif

---

## 🛠️ Platform & Teknologi

### Frontend
- **HTML5** - Struktur halaman
- **CSS3** - Styling dengan dark monochrome theme
- **JavaScript (Vanilla)** - Logika aplikasi tanpa framework
- **Tailwind CSS (CDN)** - Utility-first CSS framework

### Backend & Database
- **Supabase** - Backend-as-a-Service (PostgreSQL)
  - Database cloud
  - **Authentication** - Email/Password login untuk admin
  - **Row Level Security (RLS)** - Keamanan level database
  - Real-time capabilities
  - Free tier tersedia

### Deployment
- **Cloudflare Pages** / **Netlify** / **Vercel** (Static hosting)
- **GitHub Pages** (Alternatif gratis)
- Atau web server biasa (Apache, Nginx)

### Libraries
- **Supabase JS Client** (v2) - Koneksi database & authentication
- **XLSX.js** - Export data ke Excel

### Security
- **Row Level Security (RLS)** - Proteksi data di database level
- **Protected Routes** - Dashboard & settings hanya untuk admin
- **Public Access** - Form pendaftaran tetap bisa diakses tanpa login
- **Session Management** - Auto-refresh token, logout handling

---

## 📋 Cara Instalasi

### Prerequisites

1. **Akun Supabase** (Gratis)
   - Daftar di [supabase.com](https://supabase.com)
   - Buat project baru

2. **Web Browser Modern**
   - Chrome, Firefox, Safari, atau Edge

3. **Text Editor** (Opsional untuk development)
   - VS Code, Sublime Text, atau editor lainnya

---

### Langkah 1: Setup Database Supabase

#### 1.1 Buat Project di Supabase

1. Login ke [app.supabase.com](https://app.supabase.com)
2. Klik **"New Project"**
3. Isi:
   - **Name**: `psb-smk` (atau nama lain)
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih terdekat (Singapore)
4. Klik **"Create new project"**
5. Tunggu ~2 menit hingga project siap

#### 1.2 Dapatkan Credentials

1. Di dashboard Supabase, klik **Settings** (⚙️)
2. Pilih tab **API**
3. Copy dan simpan:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Klik tombol copy di bagian "anon public"

⚠️ **PENTING**: Gunakan **anon public** key, BUKAN service_role key!

#### 1.3 Buat Tabel Database

1. Klik **SQL Editor** di sidebar
2. Klik **"New Query"**
3. Copy-paste SQL dari file `database/migration-gelombang.sql`
4. Klik **Run** atau tekan `Ctrl+Enter`
5. Tunggu hingga muncul "Success"

SQL akan membuat:
- Tabel `registrasi_siswa` - Data pendaftar
- Tabel `pengaturan_psb` - Manajemen gelombang
- Functions & Views helper
- Sample data gelombang 2026/2027

---

### Langkah 2: Setup Authentication & Config

#### 2.1 Jalankan SQL Setup Auth

1. Klik **SQL Editor** di Supabase Dashboard
2. Copy-paste SQL dari file `database/setup-auth.sql`
3. Klik **Run**

#### 2.2 Buat Admin User

1. Dashboard > **Authentication** > **Users**
2. Klik **"Add User"**
3. Isi email & password (min 8 karakter)
4. Centang **Auto Confirm User**
5. Klik **"Create User"**

#### 2.3 Setup Konfigurasi Supabase

**Cara Termudah** - Buka wizard:
```
http://localhost:8000/public/setup-config.html
```
Ikuti 3 langkah untuk input URL & Key.

**Atau** via browser console:
```javascript
localStorage.setItem('supabase_config', JSON.stringify({
  url: 'https://YOUR_PROJECT.supabase.co',
  key: 'YOUR_ANON_KEY'
}));
```

**Atau** edit `public/js/config.js`:
```javascript
const DEV_CONFIG = {
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci...",
};
```

---

### Langkah 3: Deploy Aplikasi

#### 2.1 Update File Config

Edit file `public/js/config.js`:

```javascript
const Config = {
    supabase: {
        url: 'https://xxxxx.supabase.co',  // Ganti dengan Project URL Anda
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Ganti dengan anon key Anda
    },
    app: {
        name: 'PSB SMK Tahasus Plus Al Mardliyah',
        academicYear: '2026/2027',
        maxFileSize: 2 * 1024 * 1024  // 2MB
    }
};
```

**Simpan file!**

---

### Langkah 4: Deploy Aplikasi

Pilih salah satu metode deployment:

#### Opsi A: Cloudflare Pages (Recommended)

1. **Push ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/psb-smk.git
   git push -u origin main
   ```

2. **Connect ke Cloudflare Pages**
   - Login [dash.cloudflare.com](https://dash.cloudflare.com)
   - Klik **Pages** → **Create a project**
   - Connect repository GitHub Anda
   - Build settings:
     - Build command: (kosongkan)
     - Build output: `/`
     - Root directory: `/`
   - Klik **Save and Deploy**

3. **Tunggu deployment selesai** (~2 menit)
4. Visit URL: `https://psb-smk.pages.dev`

#### Opsi B: GitHub Pages

1. Push project ke GitHub repository
2. Go to **Settings** → **Pages**
3. Source: **Deploy from branch**
4. Branch: `main` → Folder: `/ (root)`
5. Save
6. Visit: `https://username.github.io/psb-smk`

#### Opsi C: Local Development

1. **Gunakan Live Server**
   - Install extension "Live Server" di VS Code
   - Right-click `index.html` → "Open with Live Server"
   - Buka di browser: `http://127.0.0.1:5500`

2. **Atau Python HTTP Server**
   ```bash
   cd psbnew
   python -m http.server 8000
   ```
   - Buka: `http://localhost:8000`

---

### Langkah 4: Setup Gelombang & Testing

1. Buka `public/login.html` di browser
2. Login dengan email & password admin
3. Buka `settings.html`
4. Klik **"Tambah Gelombang"** (atau edit yang sudah ada)
3. Isi data:
   - Tahun Pelajaran: `2026/2027`
   - Gelombang: `1`
   - Tanggal Mulai: `2026-01-01`
   - Tanggal Selesai: `2026-03-31`
4. Klik **"Simpan"**
5. Klik tombol **"Aktifkan"** pada gelombang yang diinginkan
6. Badge akan berubah jadi **"Aktif"** (hijau)

---

### Langkah 5: Testing

✅ **Test Login:** `public/login.html` → Dashboard  
✅ **Test Form:** `registrasi.html` → Submit tanpa login  
✅ **Test Dashboard:** Filter, search, export Excel  
✅ **Test Protected:** Akses dashboard tanpa login → redirect login

---

## 📁 Struktur Folder

```
psbnew/
├── public/
│   ├── js/
│   │   ├── config.js               # Konfigurasi Supabase
│   │   ├── auth.js                 # Authentication module
│   │   ├── form-handler.js         # Form pendaftaran
│   │   ├── validation.js           # Validasi input
│   │   └── supabase-client.js      # Supabase helper
│   ├── login.html                  # Login admin
│   └── setup-config.html           # Setup wizard config
├── database/
│   ├── migration-tables.sql        # Schema database
│   └── setup-auth.sql              # RLS & auth policies
├── index.html                       # Landing page
├── registrasi.html                 # Form pendaftaran
├── dashboard.html                  # Dashboard admin (protected)
├── settings.html                   # Settings (protected)
└── README.md                       # Dokumentasi
```

---

## 🔧 Konfigurasi

### `public/js/config.js`

File konfigurasi utama aplikasi:

```javascript
const Config = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },
    app: {
        name: 'PSB SMK Tahasus Plus Al Mardliyah',
        academicYear: '2026/2027',
        maxFileSize: 2 * 1024 * 1024
    }
};
```

**Ganti nilai berikut:**
- `YOUR_SUPABASE_URL` → Project URL dari Supabase
- `YOUR_SUPABASE_ANON_KEY` → anon public key dari Supabase

---

## 🗄️ Database Schema

### Tabel `registrasi_siswa`

Data pendaftar siswa baru:

```sql
- id (bigserial, PK)
- nomor_registrasi (text, unique)
- tahun_pelajaran (text)
- gelombang (integer)
- created_at (timestamptz)
- nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir
- nik_siswa, nisn, agama
- alamat_lengkap, hp, email
- asal_sekolah
- program_keahlian, pengetahuan_program
- no_kk, nama_ayah, nik_ayah, nama_ibu, nik_ibu
- status (pending/approved/rejected)
```

### Tabel `pengaturan_psb`

Manajemen tahun pelajaran dan gelombang:

```sql
- id (uuid, PK)
- tahun_pelajaran (text)
- gelombang (integer)
- tanggal_mulai (date)
- tanggal_selesai (date)
- is_active (boolean)
- keterangan (text)
- created_at (timestamptz)
```

---

## 🎯 Workflow Penggunaan

### Admin Setup (Sekali di Awal Tahun)

1. Buka **Settings** → Tambah gelombang untuk tahun ajaran baru
2. Aktifkan gelombang pertama
3. Landing page dan form otomatis update

### Periode Pendaftaran

1. Calon siswa buka landing page → Klik "Daftar Sekarang"
2. Isi form → Submit
3. Dapat nomor registrasi otomatis
4. Data masuk ke database

### Admin Monitoring

1. Buka **Dashboard**
2. Filter otomatis ke gelombang aktif
3. Monitor pendaftar real-time
4. Update status (Approved/Rejected)
5. Export data ke Excel

### Ganti Gelombang

1. Buka **Settings**
2. Nonaktifkan gelombang lama
3. Aktifkan gelombang baru
4. Dashboard dan form otomatis update

---

## 🐛 Troubleshooting

### 1. "Config not found" atau data tidak tersimpan

**Penyebab**: `config.js` belum diupdate atau credentials salah

**Solusi**:
- Buka `public/js/config.js`
- Pastikan `url` dan `anonKey` sudah diisi dengan benar
- Cek di Supabase Dashboard → Settings → API

### 2. "New row violates row-level security policy"

**Penyebab**: RLS policy di Supabase belum diset

**Solusi**:
- Jalankan SQL migration lengkap di Supabase SQL Editor
- Atau tambah policy manual:
  ```sql
  CREATE POLICY "Allow public insert"
  ON registrasi_siswa FOR INSERT
  TO public WITH CHECK (true);
  ```

### 3. Filter gelombang tidak otomatis

**Penyebab**: Belum ada gelombang aktif

**Solusi**:
- Buka Settings
- Aktifkan salah satu gelombang (klik tombol "Aktifkan")
- Refresh dashboard

### 4. Export Excel tidak berfungsi

**Penyebab**: Script XLSX.js tidak load

**Solusi**:
- Pastikan koneksi internet aktif (script dari CDN)
- Cek browser console (F12) untuk error
- Refresh halaman

---

## 🔒 Keamanan

### Best Practices

✅ **DO:**
- Gunakan anon key di client-side
- Enable Row Level Security (RLS)
- Validasi semua input di client & server
- Monitor Supabase logs secara berkala

❌ **DON'T:**
- JANGAN gunakan service_role key di frontend
- JANGAN commit credentials ke Git public
- JANGAN disable RLS di production
- JANGAN hardcode sensitive data

### Row Level Security (RLS)

Aplikasi ini menggunakan RLS untuk keamanan:
- **Public** bisa INSERT (pendaftaran)
- **Authenticated** bisa SELECT, UPDATE, DELETE (admin)
- Service role untuk full access

---

## 📱 Fitur Responsive

Aplikasi ini dioptimalkan untuk:
- 📱 **Mobile** (320px - 768px)
- 📱 **Tablet** (768px - 1024px)
- 💻 **Desktop** (1024px+)

Test di berbagai device untuk best experience.

---

## 🆘 Support & Dokumentasi

### Resources
- [Supabase Docs](https://supabase.com/docs)
- [JavaScript MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Debugging
- Buka **Browser Console** (F12) untuk melihat error
- Cek **Supabase Logs** di Dashboard → Logs
- Monitor **Network Tab** untuk request/response

---

## ✅ Production Checklist

Sebelum go-live:

- [ ] Supabase project created
- [ ] SQL migration (`migration-tables.sql` + `setup-auth.sql`) dijalankan
- [ ] Admin user dibuat via Dashboard
- [ ] Config Supabase diisi (via setup wizard/console/file)
- [ ] RLS enabled & policies verified
- [ ] Test login/logout/protected routes
- [ ] Test form pendaftaran (tanpa login)
- [ ] Gelombang aktif sudah diset
- [ ] Test di mobile & desktop
- [ ] Deploy ke hosting
- [ ] Backup database enabled

---

## 📊 Statistik Database

Supabase Free Tier limits:
- **Storage**: 500 MB
- **Database**: 500 MB
- **Bandwidth**: 5 GB/month
- **API Requests**: Unlimited

Cukup untuk ~10,000+ pendaftar.

---

## 🔄 Update & Maintenance

### Update Aplikasi

```bash
git pull origin main
# Deploy akan otomatis jika pakai Cloudflare/Netlify
```

### Backup Database

1. Supabase Dashboard → Settings → Database
2. Klik **Download backup**
3. Simpan file `.sql`

### Clean Up Data Lama

```sql
-- Hapus data tahun lalu (opsional)
DELETE FROM registrasi_siswa 
WHERE tahun_pelajaran < '2025/2026';
```

---

## 📄 Lisensi

Project ini untuk keperluan internal SMK Tahasus Plus Al Mardliyah.
Silakan modifikasi sesuai kebutuhan Anda.

---

## 🎉 Selamat!

Aplikasi PSB Anda siap digunakan! 🚀

**Langkah Selanjutnya:**
1. Customize design sesuai brand sekolah
2. Add program keahlian baru jika perlu
3. Setup custom domain
4. Monitor pendaftaran siswa

**Happy Coding!** 💻