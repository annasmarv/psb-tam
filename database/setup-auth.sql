-- =====================================================
-- SETUP SUPABASE AUTH & RLS POLICIES
-- PSB SMK Tahasus Plus Al Mardliyah
-- =====================================================
--
-- File ini berisi:
-- 1. Setup admin user pertama kali
-- 2. RLS (Row Level Security) policies untuk tabel registrasi_siswa
-- 3. RLS policies untuk tabel pengaturan_psb
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Copy-paste script ini
-- 3. Jalankan (Execute)
-- 4. Buat user admin pertama via Authentication UI atau gunakan script di bawah
-- =====================================================

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS untuk tabel registrasi_siswa
ALTER TABLE registrasi_siswa ENABLE ROW LEVEL SECURITY;

-- Enable RLS untuk tabel pengaturan_psb
ALTER TABLE pengaturan_psb ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (jika ada)
-- =====================================================

-- Drop policies untuk registrasi_siswa
DROP POLICY IF EXISTS "Allow public to insert registrations" ON registrasi_siswa;
DROP POLICY IF EXISTS "Allow authenticated to view all registrations" ON registrasi_siswa;
DROP POLICY IF EXISTS "Allow authenticated to update registrations" ON registrasi_siswa;
DROP POLICY IF EXISTS "Allow authenticated to delete registrations" ON registrasi_siswa;

-- Drop policies untuk pengaturan_psb
DROP POLICY IF EXISTS "Allow public to read active wave" ON pengaturan_psb;
DROP POLICY IF EXISTS "Allow authenticated to view all waves" ON pengaturan_psb;
DROP POLICY IF EXISTS "Allow authenticated to insert waves" ON pengaturan_psb;
DROP POLICY IF EXISTS "Allow authenticated to update waves" ON pengaturan_psb;
DROP POLICY IF EXISTS "Allow authenticated to delete waves" ON pengaturan_psb;

-- =====================================================
-- 3. CREATE POLICIES - REGISTRASI_SISWA
-- =====================================================

-- Policy 1: PUBLIC dapat INSERT (untuk form pendaftaran)
-- Siswa bisa mendaftar tanpa login
CREATE POLICY "Allow public to insert registrations"
ON registrasi_siswa
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy 2: AUTHENTICATED dapat SELECT semua data
-- Admin yang sudah login bisa lihat semua data
CREATE POLICY "Allow authenticated to view all registrations"
ON registrasi_siswa
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: AUTHENTICATED dapat UPDATE semua data
-- Admin bisa update status, dll
CREATE POLICY "Allow authenticated to update registrations"
ON registrasi_siswa
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: AUTHENTICATED dapat DELETE
-- Admin bisa hapus data
CREATE POLICY "Allow authenticated to delete registrations"
ON registrasi_siswa
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- 4. CREATE POLICIES - PENGATURAN_PSB
-- =====================================================

-- Policy 1: PUBLIC dapat SELECT gelombang yang aktif saja
-- Untuk landing page & form registrasi
CREATE POLICY "Allow public to read active wave"
ON pengaturan_psb
FOR SELECT
TO anon
USING (is_active = true);

-- Policy 2: AUTHENTICATED dapat SELECT semua gelombang
-- Admin bisa lihat semua gelombang (aktif & tidak)
CREATE POLICY "Allow authenticated to view all waves"
ON pengaturan_psb
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: AUTHENTICATED dapat INSERT gelombang baru
CREATE POLICY "Allow authenticated to insert waves"
ON pengaturan_psb
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 4: AUTHENTICATED dapat UPDATE gelombang
CREATE POLICY "Allow authenticated to update waves"
ON pengaturan_psb
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 5: AUTHENTICATED dapat DELETE gelombang
CREATE POLICY "Allow authenticated to delete waves"
ON pengaturan_psb
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- 5. VERIFIKASI POLICIES
-- =====================================================

-- Cek policies yang aktif untuk registrasi_siswa
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'registrasi_siswa'
ORDER BY policyname;

-- Cek policies yang aktif untuk pengaturan_psb
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'pengaturan_psb'
ORDER BY policyname;

-- =====================================================
-- 6. BUAT ADMIN USER PERTAMA (OPSIONAL)
-- =====================================================
--
-- CATATAN PENTING:
-- Cara terbaik membuat user admin adalah via Supabase Dashboard:
-- 1. Buka Supabase Dashboard > Authentication > Users
-- 2. Klik "Add User" > "Create new user"
-- 3. Masukkan email & password
-- 4. User metadata (opsional): {"role": "admin"}
--
-- ATAU gunakan script SQL di bawah (hanya untuk testing lokal):
-- ⚠️ JANGAN gunakan script ini di production!
-- ⚠️ Script ini memerlukan pgcrypto extension
--

-- Enable pgcrypto jika belum (untuk hash password)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Uncomment dan edit script di bawah untuk membuat admin:
/*
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com', -- GANTI dengan email admin Anda
    crypt('admin123', gen_salt('bf')), -- GANTI dengan password yang kuat
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);
*/

-- =====================================================
-- 7. TESTING POLICIES (OPSIONAL)
-- =====================================================
--
-- Test INSERT sebagai anon (public user - harus berhasil)
-- SET ROLE anon;
-- INSERT INTO registrasi_siswa (nama_lengkap, email, no_hp, program_keahlian)
-- VALUES ('Test User', 'test@example.com', '081234567890', 'tjkt');
-- RESET ROLE;
--
-- Test SELECT sebagai anon (harus gagal / tidak ada data)
-- SET ROLE anon;
-- SELECT * FROM registrasi_siswa;
-- RESET ROLE;
--
-- Test SELECT sebagai authenticated (harus berhasil lihat semua)
-- SET ROLE authenticated;
-- SELECT * FROM registrasi_siswa;
-- RESET ROLE;

-- =====================================================
-- 8. GRANT PERMISSIONS (jika diperlukan)
-- =====================================================

-- Grant basic permissions ke authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON registrasi_siswa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pengaturan_psb TO authenticated;

-- Grant INSERT permission ke anon untuk pendaftaran
GRANT INSERT ON registrasi_siswa TO anon;

-- Grant SELECT permission ke anon untuk baca gelombang aktif
GRANT SELECT ON pengaturan_psb TO anon;

-- Grant USAGE pada sequences (untuk auto-increment ID)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =====================================================
-- 9. CATATAN KEAMANAN
-- =====================================================
--
-- ✅ DO's (Harus dilakukan):
-- 1. Gunakan email & password yang KUAT untuk admin
-- 2. Aktifkan Email Confirmation di Supabase (Settings > Auth)
-- 3. Set password minimum length di Supabase Auth settings
-- 4. Jangan share SUPABASE_SERVICE_ROLE_KEY - simpan di server saja!
-- 5. Gunakan environment variables untuk keys
-- 6. Enable 2FA untuk akun Supabase Dashboard
--
-- ❌ DON'Ts (Jangan dilakukan):
-- 1. JANGAN hardcode password di kode
-- 2. JANGAN gunakan service_role key di client/frontend
-- 3. JANGAN disable RLS di production
-- 4. JANGAN buat policy WITH CHECK (false) - bisa lock table
-- 5. JANGAN expose anon key di public repo jika sudah ada data sensitif
--
-- =====================================================
-- SELESAI!
-- =====================================================
--
-- Setelah menjalankan script ini:
-- 1. Buat admin user pertama via Supabase Dashboard > Authentication
-- 2. Login di /public/login.html dengan email & password admin
-- 3. Test akses dashboard & settings
-- 4. Verifikasi user biasa (anon) TIDAK bisa akses dashboard
-- 5. Verifikasi form pendaftaran masih bisa digunakan tanpa login
--
-- Untuk troubleshooting:
-- - Cek Supabase Dashboard > Logs
-- - Cek browser console untuk error
-- - Test policies dengan SET ROLE di SQL Editor
--
-- =====================================================
