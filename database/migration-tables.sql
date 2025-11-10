-- =====================================================
-- PSB DATABASE MIGRATION
-- SMK Tahasus Plus Al Mardliyah
-- =====================================================
--
-- File ini berisi schema database untuk sistem PSB:
-- 1. Tabel registrasi_siswa (data pendaftar)
-- 2. Tabel pengaturan_psb (tahun & gelombang)
-- 3. Functions & helpers
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Copy-paste script ini
-- 3. Klik Run/Execute
-- =====================================================

-- =====================================================
-- 1. TABEL REGISTRASI_SISWA
-- =====================================================

CREATE TABLE IF NOT EXISTS registrasi_siswa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomor_registrasi VARCHAR(20) UNIQUE NOT NULL,

    -- Data Pribadi Siswa
    nama_lengkap VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    agama VARCHAR(50) NOT NULL,
    nik VARCHAR(16) UNIQUE NOT NULL,
    nisn VARCHAR(10) UNIQUE NOT NULL,

    -- Kontak
    no_hp VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,

    -- Alamat
    alamat_lengkap TEXT NOT NULL,
    rt VARCHAR(5),
    rw VARCHAR(5),
    desa_kelurahan VARCHAR(100) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL,
    kabupaten_kota VARCHAR(100) NOT NULL,
    provinsi VARCHAR(100) NOT NULL,
    kode_pos VARCHAR(10),

    -- Data Keluarga
    nama_ayah VARCHAR(255) NOT NULL,
    pekerjaan_ayah VARCHAR(100),
    penghasilan_ayah VARCHAR(50),
    no_hp_ayah VARCHAR(15),

    nama_ibu VARCHAR(255) NOT NULL,
    pekerjaan_ibu VARCHAR(100),
    penghasilan_ibu VARCHAR(50),
    no_hp_ibu VARCHAR(15),

    nama_wali VARCHAR(255),
    pekerjaan_wali VARCHAR(100),
    penghasilan_wali VARCHAR(50),
    no_hp_wali VARCHAR(15),

    -- Data Pendidikan
    asal_sekolah VARCHAR(255) NOT NULL,
    npsn_sekolah VARCHAR(20),
    alamat_sekolah TEXT,

    -- Program Pilihan
    program_keahlian VARCHAR(50) NOT NULL CHECK (program_keahlian IN ('tjkt', 'tatabusana', 'tataboga')),
    alasan_memilih TEXT,

    -- Tahun & Gelombang
    tahun_pelajaran VARCHAR(20) NOT NULL,
    gelombang INTEGER NOT NULL,

    -- Status & Metadata
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    catatan TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_registrasi_tahun_gelombang
    ON registrasi_siswa(tahun_pelajaran, gelombang);
CREATE INDEX IF NOT EXISTS idx_registrasi_program
    ON registrasi_siswa(program_keahlian);
CREATE INDEX IF NOT EXISTS idx_registrasi_status
    ON registrasi_siswa(status);
CREATE INDEX IF NOT EXISTS idx_registrasi_created
    ON registrasi_siswa(created_at DESC);

-- =====================================================
-- 2. TABEL PENGATURAN_PSB
-- =====================================================

CREATE TABLE IF NOT EXISTS pengaturan_psb (
    id SERIAL PRIMARY KEY,
    tahun_pelajaran VARCHAR(20) NOT NULL,
    gelombang INTEGER NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    kuota_tjkt INTEGER DEFAULT 0,
    kuota_tatabusana INTEGER DEFAULT 0,
    kuota_tataboga INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: 1 tahun/gelombang tidak boleh duplikat
    CONSTRAINT unique_tahun_gelombang UNIQUE (tahun_pelajaran, gelombang)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pengaturan_active
    ON pengaturan_psb(is_active);
CREATE INDEX IF NOT EXISTS idx_pengaturan_tahun
    ON pengaturan_psb(tahun_pelajaran);

-- =====================================================
-- 3. FUNCTION: UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS update_registrasi_siswa_updated_at ON registrasi_siswa;
CREATE TRIGGER update_registrasi_siswa_updated_at
    BEFORE UPDATE ON registrasi_siswa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pengaturan_psb_updated_at ON pengaturan_psb;
CREATE TRIGGER update_pengaturan_psb_updated_at
    BEFORE UPDATE ON pengaturan_psb
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. FUNCTION: ENFORCE SINGLE ACTIVE WAVE
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_single_active_wave()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        -- Set semua gelombang lain jadi tidak aktif
        UPDATE pengaturan_psb
        SET is_active = FALSE
        WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk enforce hanya 1 gelombang aktif
DROP TRIGGER IF EXISTS single_active_wave ON pengaturan_psb;
CREATE TRIGGER single_active_wave
    AFTER INSERT OR UPDATE ON pengaturan_psb
    FOR EACH ROW
    WHEN (NEW.is_active = TRUE)
    EXECUTE FUNCTION enforce_single_active_wave();

-- =====================================================
-- 5. SAMPLE DATA - PENGATURAN PSB
-- =====================================================

-- Insert sample gelombang untuk tahun 2025/2026 dan 2026/2027
INSERT INTO pengaturan_psb
    (tahun_pelajaran, gelombang, tanggal_mulai, tanggal_selesai, is_active, keterangan)
VALUES
    ('2025/2026', 1, '2025-01-01', '2025-03-31', FALSE, 'Gelombang 1 tahun ajaran 2025/2026'),
    ('2025/2026', 2, '2025-04-01', '2025-06-30', FALSE, 'Gelombang 2 tahun ajaran 2025/2026'),
    ('2026/2027', 1, '2026-01-01', '2026-03-31', TRUE, 'Gelombang 1 tahun ajaran 2026/2027 - AKTIF'),
    ('2026/2027', 2, '2026-04-01', '2026-06-30', FALSE, 'Gelombang 2 tahun ajaran 2026/2027')
ON CONFLICT (tahun_pelajaran, gelombang) DO NOTHING;

-- =====================================================
-- 6. VIEWS (HELPER)
-- =====================================================

-- View: Active Wave
CREATE OR REPLACE VIEW active_wave AS
SELECT * FROM pengaturan_psb
WHERE is_active = TRUE
LIMIT 1;

-- View: Statistik per program
CREATE OR REPLACE VIEW statistik_program AS
SELECT
    tahun_pelajaran,
    gelombang,
    program_keahlian,
    COUNT(*) as total_pendaftar,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
FROM registrasi_siswa
GROUP BY tahun_pelajaran, gelombang, program_keahlian
ORDER BY tahun_pelajaran DESC, gelombang ASC, program_keahlian;

-- View: Statistik per tahun
CREATE OR REPLACE VIEW statistik_tahun AS
SELECT
    tahun_pelajaran,
    gelombang,
    COUNT(*) as total_pendaftar,
    COUNT(CASE WHEN program_keahlian = 'tjkt' THEN 1 END) as tjkt,
    COUNT(CASE WHEN program_keahlian = 'tatabusana' THEN 1 END) as tatabusana,
    COUNT(CASE WHEN program_keahlian = 'tataboga' THEN 1 END) as tataboga,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
FROM registrasi_siswa
GROUP BY tahun_pelajaran, gelombang
ORDER BY tahun_pelajaran DESC, gelombang ASC;

-- =====================================================
-- 7. GRANTS (akan di-override oleh RLS)
-- =====================================================

-- Grant basic permissions
-- NOTE: RLS policies di setup-auth.sql akan override ini
GRANT SELECT, INSERT ON registrasi_siswa TO anon;
GRANT SELECT ON pengaturan_psb TO anon;

-- =====================================================
-- 8. VERIFIKASI
-- =====================================================

-- Cek tabel sudah dibuat
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('registrasi_siswa', 'pengaturan_psb')
ORDER BY table_name;

-- Cek gelombang aktif
SELECT * FROM active_wave;

-- Cek jumlah gelombang
SELECT COUNT(*) as total_gelombang FROM pengaturan_psb;

-- =====================================================
-- SELESAI!
-- =====================================================
--
-- Tabel & functions berhasil dibuat!
--
-- NEXT STEPS:
-- 1. Jalankan setup-auth.sql untuk RLS policies
-- 2. Buat admin user di Authentication > Users
-- 3. Test form pendaftaran
--
-- =====================================================
