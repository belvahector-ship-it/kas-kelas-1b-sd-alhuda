# Kas Kelas 1B — SD Islam Al Huda

🔗 **Situs:** https://belvahector-ship-it.github.io/kas-kelas-1b-sd-alhuda/

Portal transparansi kas kelas: satu halaman, statis, membaca langsung dari Google
Spreadsheet. Wali murid bisa mengecek status iuran anaknya tanpa login. Bendahara
bisa masuk dengan akun Google untuk mencentang pembayaran dan mencatat pengeluaran.

**Angka saat ini:** kas masuk `Rp2.415.000` · pengeluaran `Rp755.000` · saldo `Rp1.660.000`
· 28 siswa · 161 dari 336 bulan-siswa terbayar (48%).

---

## Menjalankan di komputer sendiri

Halaman ini **tidak bisa** dibuka lewat klik ganda pada `index.html` — browser memblokir
`fetch()` pada protokol `file://`. Jalankan lewat server lokal:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

Tidak perlu `npm install`, tidak ada proses build. Sunting file, muat ulang, selesai.

## Isi folder

```
index.html                 seluruh halaman
assets/css/style.css       sistem desain neo-brutalist + animasi
assets/js/config.js        SATU-SATUNYA file yang perlu diedit tangan
assets/js/app.js           ambil data, hitung, render, login, simpan
data/snapshot.json         data cadangan (dari file .xlsx)
SPEC.md                    apa yang dibangun & kontrak API
DECISIONS.md               kenapa dibangun begitu — baca ini dulu kalau melanjutkan
```

## Dari mana datanya

Tiga lapis, dicoba berurutan:

1. **Google Spreadsheet (utama)** — dibaca lewat Google Visualization API. Tanpa API key,
   tanpa login, syaratnya spreadsheet di-share **"Anyone with the link → Viewer"**.
2. **`data/snapshot.json` (cadangan)** — dipakai otomatis kalau spreadsheet tidak terbaca.
   Halaman tetap tampil benar, dengan pemberitahuan bahwa datanya cadangan.
3. Kalau keduanya gagal, muncul pesan error yang menyebutkan penyebabnya.

Semua total (kas masuk, saldo, tunggakan) **dihitung ulang di browser** dari centang `v`
dan nominal pengeluaran — bukan disalin dari kolom total di spreadsheet. Kolom total di
sheet sudah terbukti tidak konsisten; lihat `DECISIONS.md` CP-01.

### Memperbarui snapshot cadangan

Kalau data di spreadsheet berubah banyak dan Anda ingin cadangannya ikut segar,
unduh ulang sebagai `.xlsx` lalu jalankan skrip yang sama seperti waktu pembuatan
(butuh `pip install openpyxl`). Atau, karena mode live sudah jalan, biarkan saja —
snapshot hanya jaring pengaman.

---

## Mengaktifkan Mode Edit

Tanpa langkah ini halaman tetap berfungsi penuh dalam **mode baca**. Tombol "Mode Edit"
akan menampilkan panduan, bukan error.

Sekali saja, ±5 menit:

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → **buat project baru**.
2. **APIs & Services → Library** → cari **Google Sheets API** → **Enable**.
3. **OAuth consent screen** → tipe **External** → isi nama aplikasi & email dukungan.
   Di bagian **Test users**, tambahkan email bendahara.
   (Selama status masih "Testing", hanya email di daftar itu yang bisa login — ini justru
   yang kita mau.)
4. **Credentials → Create Credentials → OAuth client ID** → tipe **Web application**.
5. **Authorized JavaScript origins** — isi alamat situsnya, tanpa garis miring di akhir:
   - `http://localhost:8000` (untuk mencoba di komputer)
   - `https://belvahector-ship-it.github.io` (situs yang sudah online)

   Isi **origin**-nya saja — tanpa `/kas-kelas-1b-sd-alhuda` dan tanpa garis miring
   di akhir. Ini sering keliru dan menghasilkan error `redirect_uri_mismatch`.
6. Salin **Client ID**, tempel ke `assets/js/config.js`:

```js
OAUTH_CLIENT_ID: '1234567890-abcdef.apps.googleusercontent.com',
ADMIN_EMAILS: ['bendahara1b@gmail.com'],
```

7. Di Google Spreadsheet, **Share** → beri akun bendahara akses **Editor**.

### Cara pakai mode edit

- Klik **🔐 Mode Edit** → pilih akun Google → badge hijau muncul di kanan atas.
- **Klik sel bulan** pada tabel untuk mengubah lunas ⇄ belum. Langsung tersimpan.
- **Isi form "Catat Pengeluaran"** untuk menambah baris baru di sheet `REKAP KAS`.
- Klik **Keluar** kalau sudah selesai. Token dibuang, tidak disimpan di browser.

### Soal keamanan — penting

`ADMIN_EMAILS` ada di file JavaScript yang bisa dibaca siapa saja. Orang yang paham
DevTools bisa memaksa tombol edit muncul.

**Tapi tombol itu tidak akan berfungsi.** Saat menyimpan, Google Sheets API menolak
dengan `403` kecuali akun tersebut memang diberi akses **Editor** pada spreadsheet.

Jadi:
- `ADMIN_EMAILS` = merapikan tampilan, supaya orang lain tidak melihat tombol edit.
- **Sharing setting spreadsheet = keamanan yang sebenarnya.**
- **Jangan** men-share spreadsheet sebagai *"Anyone with the link can edit"*. Itu akan
  membuat siapa pun bisa mengubah data, dan tidak ada kode di sini yang bisa mencegahnya.

---

## Memasang online (GitHub Pages)

```bash
git init
git add .
git commit -m "Portal transparansi kas kelas 1B"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

Lalu di GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
Beberapa menit kemudian situs hidup di `https://<username>.github.io/<nama-repo>/`.

Setelah itu, kembali ke Google Cloud Console dan **tambahkan alamat itu ke Authorized
JavaScript origins** — kalau tidak, login akan gagal di situs online meski jalan di localhost.

---

## Konfigurasi (`assets/js/config.js`)

| Kunci | Isi |
|---|---|
| `SHEET_ID` | ID spreadsheet, diambil dari URL-nya |
| `SHEET_IURAN` / `SHEET_KAS` | Nama tab, harus **persis** sama termasuk spasi & huruf besar |
| `ROW_START_IURAN` / `ROW_START_KAS` | Baris pertama berisi data (`4`, karena baris 1–3 judul) |
| `COL_FIRST_MONTH` | Kolom bulan pertama (`D` = Juli) |
| `IURAN_PER_BULAN` | `15000` |
| `OAUTH_CLIENT_ID` | Dari Google Cloud Console. Kosong = mode baca saja |
| `ADMIN_EMAILS` | Email yang melihat tombol edit. Kosongkan `[]` untuk mengizinkan semua yang punya izin Editor |
| `USE_LIVE_SHEET` | `false` untuk memaksa memakai snapshot saja |

**Kalau struktur spreadsheet berubah** (menambah siswa, menggeser kolom), yang perlu
disesuaikan hanya `ROW_START_*` dan `COL_FIRST_MONTH`. Menambah siswa di baris bawah
tidak perlu perubahan kode apa pun — jumlah baris dibaca otomatis.

---

## Yang sudah diuji

Diperiksa langsung di browser, bukan diasumsikan:

- Baca live dari Google Sheet → 28 siswa, 161 pembayaran, cocok dengan hitungan manual Excel.
- Snapshot cadangan menghasilkan angka identik dengan mode live.
- Saldo `Rp1.660.000` cocok dengan kolom `Net` di sheet aslinya.
- Pencarian nama, filter Lunas / Ada Tunggakan.
- Klik sel saat **belum** login tidak mengubah apa pun.
- Lebar 360px / 768px / 1440px — tidak ada scroll horizontal di halaman;
  tabel & grafik menggulir di dalam kotaknya sendiri.
- Semua target sentuh ≥ 44px.
- Tombol Mode Edit tanpa konfigurasi → menampilkan panduan, bukan error.

## Batasan yang diketahui

Ditulis terbuka, bukan didiamkan — rinciannya di `DECISIONS.md` CP-06:

1. **Tidak ada riwayat perubahan.** Kalau seseorang salah klik, tidak tercatat siapa.
   Penambal sementara: **File → Version history** bawaan Google Sheets.
2. **Tidak ada penguncian bersamaan.** Kalau dua orang mengedit berbarengan, yang
   menyimpan terakhir yang menang.
3. **Kolom C, D, H, I di sheet `REKAP KAS`** (Pemasukan Per Bulan, Total Kas Masuk,
   Total pengeluaran, Net) sudah tidak konsisten sejak awal dan tidak dipakai web.
   Web menulis ulang H dan I saat menambah pengeluaran, tapi C dan D dibiarkan.
4. **Bulan pada pengeluaran dipilih manual**, tidak diturunkan otomatis dari tanggal.
5. **Satu klik sel = satu permintaan ke Google.** Aman untuk ukuran satu kelas.

## Kalau ada yang tidak jalan

| Gejala | Kemungkinan sebab |
|---|---|
| Muncul "menampilkan data cadangan" | Spreadsheet belum di-share sebagai Viewer publik, atau tidak ada internet |
| Login gagal, `redirect_uri_mismatch` | Alamat situs belum didaftarkan di **Authorized JavaScript origins** |
| Simpan gagal `403` | Akun belum diberi akses **Editor** di spreadsheet, atau **Google Sheets API** belum di-Enable |
| Simpan gagal `404` | `SHEET_ID` salah, atau nama tab di `config.js` beda dengan di spreadsheet |
| Angka tidak muncul saat dibuka | Halaman dibuka lewat `file://` — harus lewat server (lihat bagian paling atas) |
