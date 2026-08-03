/* =========================================================================
   KONFIGURASI — satu-satunya file yang perlu diedit tangan.
   ========================================================================= */

window.CONFIG = {

  /* ---- Spreadsheet ---- */
  // ID diambil dari URL: docs.google.com/spreadsheets/d/<ID>/edit
  SHEET_ID: '1LVg64_HIVvZk2HReb08HB3LB-K_48qpqXxECAxca-Qo',

  // Nama tab persis seperti di spreadsheet (huruf besar/kecil & spasi berpengaruh)
  SHEET_IURAN: 'TABEL IURAN',
  SHEET_KAS:   'REKAP KAS',

  // Baris pertama yang berisi data (baris 1–3 adalah judul & header)
  ROW_START_IURAN: 4,
  ROW_START_KAS:   4,

  // Kolom pertama bulan di sheet TABEL IURAN (D = JULI)
  COL_FIRST_MONTH: 'D',

  /* ---- Nominal ---- */
  IURAN_PER_BULAN: 15000,

  /* ---- Login Google (kosongkan kalau belum disiapkan) ----
     Cara membuatnya ada di modal "Mode Edit Belum Disiapkan" di halaman,
     atau di README.md bagian "Mengaktifkan Mode Edit".                     */
  OAUTH_CLIENT_ID: '',

  /* Email yang boleh melihat tombol edit.
     PENTING: ini hanya untuk kerapian tampilan, BUKAN keamanan.
     Keamanan sesungguhnya = izin Editor di spreadsheet. Google API yang
     menolak, bukan daftar ini. Lihat DECISIONS.md CP-03.
     Kosongkan array ini ([]) kalau ingin semua akun Google yang punya izin
     edit di spreadsheet otomatis boleh mengedit.                            */
  ADMIN_EMAILS: [
    // 'bendahara1b@gmail.com',
  ],

  /* ---- Perilaku ---- */
  // true  = coba baca dari Google Sheet dulu (data selalu terbaru)
  // false = selalu pakai data/snapshot.json (mode offline / sheet diprivat)
  USE_LIVE_SHEET: true,

  // Batas waktu menunggu Google Sheet sebelum jatuh ke snapshot (ms)
  FETCH_TIMEOUT: 8000,
};
