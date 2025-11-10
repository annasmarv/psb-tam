/**
 * PSB Security Module - Unified & Simplified
 * Combines XSS protection, PII masking, rate limiting, and dashboard helpers
 */

(function () {
  "use strict";

  // ========================================
  // 1. XSS PROTECTION
  // ========================================

  function escapeHtml(unsafe) {
    if (!unsafe) return "-";
    if (typeof unsafe !== "string") unsafe = String(unsafe);
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sanitizeObject(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = typeof value === "string" ? escapeHtml(value) : value;
    }
    return sanitized;
  }

  // ========================================
  // 2. PII MASKING
  // ========================================

  function maskNIK(nik) {
    if (!nik || typeof nik !== "string" || nik.length !== 16) return nik || "-";
    return nik.substring(0, 4) + "********" + nik.substring(12);
  }

  function maskNISN(nisn) {
    if (!nisn || typeof nisn !== "string" || nisn.length !== 10)
      return nisn || "-";
    return nisn.substring(0, 2) + "****" + nisn.substring(6);
  }

  function maskPhone(phone) {
    if (!phone || typeof phone !== "string") return phone || "-";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) return phone;
    return cleaned.substring(0, 4) + "****" + cleaned.substring(8);
  }

  // ========================================
  // 3. RATE LIMITING
  // ========================================

  const rateLimits = new Map();

  function checkRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const record = rateLimits.get(key) || {
      count: 0,
      firstAttempt: now,
      resetAt: now + windowMs,
    };

    if (now > record.resetAt) {
      record.count = 0;
      record.firstAttempt = now;
      record.resetAt = now + windowMs;
    }

    record.count++;
    rateLimits.set(key, record);

    const remaining = Math.max(0, maxAttempts - record.count);
    const resetIn = Math.ceil((record.resetAt - now) / 1000 / 60);

    return {
      allowed: record.count <= maxAttempts,
      remaining: remaining,
      resetIn: resetIn,
      message:
        record.count > maxAttempts
          ? `Terlalu banyak percobaan. Coba lagi dalam ${resetIn} menit.`
          : null,
    };
  }

  function resetRateLimit(key) {
    rateLimits.delete(key);
  }

  // ========================================
  // 4. SAFE ERROR MESSAGES
  // ========================================

  function getSafeErrorMessage(error) {
    if (!error) return "Terjadi kesalahan sistem";

    const errorMap = {
      'relation "registrasi_siswa" does not exist': "Terjadi kesalahan sistem",
      "duplicate key value violates": "Data sudah terdaftar sebelumnya",
      "foreign key violation": "Data terkait tidak ditemukan",
      "permission denied": "Anda tidak memiliki akses",
      "invalid input syntax": "Format data tidak valid",
      "value too long": "Data terlalu panjang",
      "not-null constraint": "Data wajib diisi",
      "check constraint": "Data tidak memenuhi kriteria",
      "JWT expired": "Sesi Anda telah berakhir, silakan login kembali",
      "Invalid login credentials": "Email atau password salah",
      "Email not confirmed": "Email belum diverifikasi",
    };

    const errorMessage = error.message || error.error?.message || String(error);

    for (const [dbError, userMsg] of Object.entries(errorMap)) {
      if (errorMessage.toLowerCase().includes(dbError.toLowerCase())) {
        return userMsg;
      }
    }

    return "Terjadi kesalahan. Silakan coba lagi atau hubungi administrator.";
  }

  // ========================================
  // 5. AUDIT LOGGING
  // ========================================

  async function logSecurityEvent(action, details = {}) {
    const event = {
      action: action,
      timestamp: new Date().toISOString(),
      user: window.Auth?.getUserInfo()?.email || "anonymous",
      userAgent: navigator.userAgent,
      ...details,
    };

    console.log("[SECURITY EVENT]", event);
    return event;
  }

  // ========================================
  // 6. EXPORT PROTECTION
  // ========================================

  async function confirmSensitiveExport(recordCount) {
    const confirmed = confirm(
      "⚠️ EXPORT DATA SENSITIF\n\n" +
        `Anda akan mengexport ${recordCount} data yang mengandung informasi pribadi (NIK, NISN, No HP, dll).\n\n` +
        "PENTING:\n" +
        "• Data ini bersifat RAHASIA dan dilindungi UU PDP\n" +
        "• Anda bertanggung jawab atas keamanan file export\n" +
        "• Jangan share file ke pihak tidak berwenang\n" +
        "• Hapus file setelah selesai digunakan\n\n" +
        "Aktivitas export akan dicatat untuk audit.\n\n" +
        "Lanjutkan export?",
    );

    if (confirmed) {
      await logSecurityEvent("EXPORT_SENSITIVE_DATA", {
        recordCount: recordCount,
        confirmed: true,
      });
    }

    return confirmed;
  }

  // ========================================
  // 7. AUTO-LOGOUT (INACTIVITY)
  // ========================================

  let inactivityTimer;
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 menit

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
      await logSecurityEvent("AUTO_LOGOUT", { reason: "inactivity_timeout" });
      if (window.Auth && typeof window.Auth.logout === "function") {
        await window.Auth.logout();
        alert("Anda telah logout otomatis karena tidak aktif selama 30 menit.");
        window.location.href = "/public/login.html";
      }
    }, INACTIVITY_TIMEOUT);
  }

  function setupInactivityMonitoring() {
    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer, true);
    });
    resetInactivityTimer();
  }

  // ========================================
  // 8. DASHBOARD HELPERS
  // ========================================

  function renderSecureTableRow(item, rowNumber, isSelected) {
    const safe = {
      id: escapeHtml(String(item.id)),
      nomor_registrasi: escapeHtml(item.nomor_registrasi || "-"),
      tahun_pelajaran: escapeHtml(item.tahun_pelajaran || "-"),
      gelombang: escapeHtml(item.gelombang || "-"),
      nama_lengkap: escapeHtml(item.nama_lengkap || "-"),
      nisn: maskNISN(item.nisn || "-"),
      asal_sekolah: escapeHtml(item.asal_sekolah || "-"),
      program: escapeHtml(item.program_utama || item.program_keahlian || "-"),
      jenis_kelamin: escapeHtml(item.jenis_kelamin || "-"),
    };

    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const statusBadge = getStatusBadge(item.status || "pending");
    const genderBadge =
      safe.jenis_kelamin === "Laki-laki"
        ? '<span class="badge badge-male">L</span>'
        : '<span class="badge badge-female">P</span>';

    return `
      <tr class="${isSelected ? "selected" : ""}">
        <td><input type="checkbox" class="checkbox row-checkbox" data-id="${safe.id}" ${isSelected ? "checked" : ""}></td>
        <td>${rowNumber}</td>
        <td>${safe.nomor_registrasi}</td>
        <td>${safe.tahun_pelajaran}</td>
        <td>${safe.gelombang}</td>
        <td>${formattedDate}</td>
        <td>${safe.nama_lengkap}</td>
        <td>${safe.nisn}</td>
        <td>${genderBadge}</td>
        <td>${safe.asal_sekolah}</td>
        <td>${safe.program}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-buttons">
            <button class="icon-btn btn-view" data-id="${safe.id}" title="Lihat Detail">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
            <button class="icon-btn danger btn-delete" data-id="${safe.id}" title="Hapus">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function getStatusBadge(status) {
    const safeStatus = escapeHtml(status);
    const statusMap = {
      pending: '<span class="badge badge-pending">Pending</span>',
      approved: '<span class="badge badge-approved">Approved</span>',
      rejected: '<span class="badge badge-rejected">Rejected</span>',
    };
    return statusMap[safeStatus] || statusMap.pending;
  }

  function renderSecureModalDetail(item) {
    const safe = sanitizeObject({
      nomor_registrasi: item.nomor_registrasi || "-",
      nama_lengkap: item.nama_lengkap || "-",
      jenis_kelamin: item.jenis_kelamin || "-",
      tempat_lahir: item.tempat_lahir || "-",
      tanggal_lahir: item.tanggal_lahir || "-",
      nik_siswa: item.nik_siswa || "-",
      anak_ke: item.anak_ke || "-",
      jumlah_saudara: item.jumlah_saudara || "-",
      tinggi_badan: item.tinggi_badan || "-",
      berat_badan: item.berat_badan || "-",
      agama: item.agama || "-",
      nisn: item.nisn || "-",
      alamat_lengkap: item.alamat_lengkap || "-",
      asal_sekolah: item.asal_sekolah || "-",
      hp: item.hp || item.no_hp || "-",
      program: item.program_utama || item.program_keahlian || "-",
      pengetahuan_program: item.pengetahuan_program || "-",
      no_kk: item.no_kk || "-",
      nama_ayah: item.nama_ayah || "-",
      nik_ayah: item.nik_ayah || "-",
      nama_ibu: item.nama_ibu || "-",
      nik_ibu: item.nik_ibu || "-",
    });

    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const statusBadge = getStatusBadge(item.status || "pending");

    return `
      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">📋 Informasi Pendaftaran</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">No. Registrasi</div>
            <div class="detail-value">${safe.nomor_registrasi}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Tanggal Daftar</div>
            <div class="detail-value">${formattedDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Status Pendaftaran</div>
            <div class="detail-value">${statusBadge}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">👤 Data Pribadi Siswa</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Nama Lengkap</div>
            <div class="detail-value">${safe.nama_lengkap}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Jenis Kelamin</div>
            <div class="detail-value">${safe.jenis_kelamin}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Tempat Lahir</div>
            <div class="detail-value">${safe.tempat_lahir}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Tanggal Lahir</div>
            <div class="detail-value">${safe.tanggal_lahir}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">NIK Siswa</div>
            <div class="detail-value">${safe.nik_siswa}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Anak Ke</div>
            <div class="detail-value">${safe.anak_ke}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Jumlah Saudara</div>
            <div class="detail-value">${safe.jumlah_saudara}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Tinggi Badan</div>
            <div class="detail-value">${safe.tinggi_badan !== "-" ? safe.tinggi_badan + " cm" : "-"}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Berat Badan</div>
            <div class="detail-value">${safe.berat_badan !== "-" ? safe.berat_badan + " kg" : "-"}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Agama</div>
            <div class="detail-value">${safe.agama}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">NISN</div>
            <div class="detail-value">${safe.nisn}</div>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="detail-label">Alamat Lengkap</div>
            <div class="detail-value">${safe.alamat_lengkap}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Asal Sekolah</div>
            <div class="detail-value">${safe.asal_sekolah}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">No. HP/WA</div>
            <div class="detail-value">${safe.hp}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">🎓 Program Keahlian</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Program Pilihan</div>
            <div class="detail-value">${safe.program}</div>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="detail-label">Pengetahuan tentang Program</div>
            <div class="detail-value" style="white-space: pre-wrap;">${safe.pengetahuan_program}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">👨‍👩‍👦 Data Orang Tua / Wali</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">No. Kartu Keluarga</div>
            <div class="detail-value">${safe.no_kk}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Nama Ayah/Wali</div>
            <div class="detail-value">${safe.nama_ayah}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">NIK Ayah</div>
            <div class="detail-value">${safe.nik_ayah}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Nama Ibu/Wali</div>
            <div class="detail-value">${safe.nama_ibu}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">NIK Ibu</div>
            <div class="detail-value">${safe.nik_ibu}</div>
          </div>
        </div>
      </div>
    `;
  }

  async function secureExportToExcel(data, filterYear, filterGel) {
    if (data.length === 0) return false;

    const confirmed = await confirmSensitiveExport(data.length);
    if (!confirmed) return false;

    try {
      const exportData = data.map((item, index) => ({
        No: index + 1,
        "No. Registrasi": escapeHtml(item.nomor_registrasi || "-"),
        "Tahun Pelajaran": escapeHtml(item.tahun_pelajaran || "-"),
        Gelombang: escapeHtml(item.gelombang || "-"),
        "Tanggal Daftar": new Date(item.created_at).toLocaleDateString("id-ID"),
        Status: escapeHtml(item.status || "pending"),
        "Nama Lengkap": escapeHtml(item.nama_lengkap || "-"),
        "Jenis Kelamin": escapeHtml(item.jenis_kelamin || "-"),
        "Tempat Lahir": escapeHtml(item.tempat_lahir || "-"),
        "Tanggal Lahir": escapeHtml(item.tanggal_lahir || "-"),
        "NIK Siswa": escapeHtml(item.nik_siswa || "-"),
        "Anak Ke": escapeHtml(String(item.anak_ke || "-")),
        "Jumlah Saudara": escapeHtml(String(item.jumlah_saudara || "-")),
        "Tinggi Badan (cm)": escapeHtml(String(item.tinggi_badan || "-")),
        "Berat Badan (kg)": escapeHtml(String(item.berat_badan || "-")),
        Agama: escapeHtml(item.agama || "-"),
        NISN: escapeHtml(item.nisn || "-"),
        "Alamat Lengkap": escapeHtml(item.alamat_lengkap || "-"),
        "Asal Sekolah": escapeHtml(item.asal_sekolah || "-"),
        "No. HP/WA": escapeHtml(item.hp || item.no_hp || "-"),
        "Program Keahlian": escapeHtml(
          item.program_utama || item.program_keahlian || "-",
        ),
        "Pengetahuan Program": escapeHtml(item.pengetahuan_program || "-"),
        "No. KK": escapeHtml(item.no_kk || "-"),
        "Nama Ayah": escapeHtml(item.nama_ayah || "-"),
        "NIK Ayah": escapeHtml(item.nik_ayah || "-"),
        "Nama Ibu": escapeHtml(item.nama_ibu || "-"),
        "NIK Ibu": escapeHtml(item.nik_ibu || "-"),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Pendaftaran");

      const colWidths = [
        { wch: 5 },
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 18 },
        { wch: 10 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 15 },
        { wch: 50 },
        { wch: 35 },
        { wch: 15 },
        { wch: 20 },
        { wch: 50 },
        { wch: 18 },
        { wch: 30 },
        { wch: 18 },
        { wch: 30 },
        { wch: 18 },
      ];
      ws["!cols"] = colWidths;

      const filterInfo =
        filterYear !== "Semua" || filterGel !== "Semua"
          ? `_${filterYear.replace("/", "-")}_Gel${filterGel}`
          : "";
      const filename = `Data_Pendaftaran${filterInfo}_${new Date().toISOString().split("T")[0]}.xlsx`;

      XLSX.writeFile(wb, filename);

      await logSecurityEvent("EXPORT_DATA", {
        recordCount: data.length,
        filter: { year: filterYear, gelombang: filterGel },
        filename: filename,
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  // ========================================
  // 9. EXPOSE PUBLIC API
  // ========================================

  window.Security = {
    // XSS Protection
    escapeHtml: escapeHtml,
    sanitizeObject: sanitizeObject,

    // PII Masking
    maskNIK: maskNIK,
    maskNISN: maskNISN,
    maskPhone: maskPhone,

    // Rate Limiting
    checkRateLimit: checkRateLimit,
    resetRateLimit: resetRateLimit,

    // Error Handling
    getSafeErrorMessage: getSafeErrorMessage,

    // Audit & Export
    logSecurityEvent: logSecurityEvent,
    confirmSensitiveExport: confirmSensitiveExport,

    // Session
    setupInactivityMonitoring: setupInactivityMonitoring,
    resetInactivityTimer: resetInactivityTimer,

    // Dashboard Helpers
    renderSecureTableRow: renderSecureTableRow,
    renderSecureModalDetail: renderSecureModalDetail,
    secureExportToExcel: secureExportToExcel,
    getStatusBadge: getStatusBadge,
  };

  // Auto-setup inactivity monitoring (disabled - no auth system)
  // if (typeof window.Auth !== "undefined") {
  //   document.addEventListener("DOMContentLoaded", () => {
  //     window.Auth.checkAuth().then((result) => {
  //       if (result.authenticated) {
  //         setupInactivityMonitoring();
  //       }
  //     });
  //   });
  // }
})();
