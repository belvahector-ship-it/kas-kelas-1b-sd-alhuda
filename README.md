# Kas Kelas 1B — SD Islam Al Huda

🔗 **Situs:** https://kas-alhuda.my.id

(Alamat lama `belvahector-ship-it.github.io/kas-kelas-1b-sd-alhuda/` tetap hidup dan
otomatis dialihkan ke domain di atas.)

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

## Mode Edit — sudah aktif ✅

Sudah dikonfigurasi, tidak perlu diulang. Ringkasnya:

| Item | Nilai |
|---|---|
| Project Google Cloud | `kas-kelas-1b-al-huda` (pemilik: belvahector@gmail.com) |
| Google Sheets API | Enabled |
| Consent screen | External, status **Testing** |
| Test user | `rahmapujirahayu309@gmail.com` |
| Yang boleh login | `rahmapujirahayu309@gmail.com` saja |

**Cara pakai:** buka https://kas-alhuda.my.id → klik **🔐 Mode Edit** → pilih akun
`rahmapujirahayu309@gmail.com`. Google akan menampilkan peringatan *"Google hasn't verified
this app"* — itu normal untuk aplikasi berstatus Testing; pilih **Advanced → Go to Kas
Kelas 1B SD Islam Al Huda (unsafe)**. Setelah masuk, badge hijau muncul di kanan atas.

- **Klik sel bulan** di tabel untuk mengubah lunas ⇄ belum — langsung tersimpan ke spreadsheet.
- **Isi form "Catat Pengeluaran"** untuk menambah baris di sheet `REKAP KAS`.
- Klik **Keluar** kalau selesai. Token tidak disimpan di browser.

**Kalau menyimpan gagal dengan `403`:** akun `rahmapujirahayu309@gmail.com` belum punya
akses **Editor** pada spreadsheet. Buka spreadsheet → **Share** → pastikan akun itu Editor
(kalau dia pemiliknya, otomatis sudah). Jangan ubah *General access* menjadi Editor —
biarkan **"Anyone with the link → Viewer"**.

**Menambah admin lain:** dua tempat harus diubah, keduanya wajib —
1. `ADMIN_EMAILS` di `assets/js/config.js`
2. **Test users** di Google Cloud Console → Google Auth Platform → Audience

<details>
<summary>Panduan asli membuat OAuth dari nol (kalau nanti perlu membuat ulang)</summary>

Sekali saja, ±5 menit:

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → **buat project baru**.
2. **APIs & Services → Library** → cari **Google Sheets API** → **Enable**.
3. **OAuth consent screen** → tipe **External** → isi nama aplikasi & email dukungan.
   Di bagian **Test users**, tambahkan email bendahara.
   (Selama status masih "Testing", hanya email di daftar itu yang bisa login — ini justru
   yang kita mau.)
4. **Credentials → Create Credentials → OAuth client ID** → tipe **Web application**.
5. **Authorized JavaScript origins** — isi alamat situsnya, tanpa garis miring di akhir:
   - `https://kas-alhuda.my.id` ← **yang utama**
   - `http://localhost:8000` (untuk mencoba di komputer)
   - `https://belvahector-ship-it.github.io` (alamat lama, kalau masih dipakai)

   Isi **origin**-nya saja — tanpa path dan tanpa garis miring di akhir. Ini sering
   keliru dan menghasilkan error `redirect_uri_mismatch`.
6. Salin **Client ID**, tempel ke `assets/js/config.js`:

```js
OAUTH_CLIENT_ID: '1234567890-abcdef.apps.googleusercontent.com',
ADMIN_EMAILS: ['bendahara1b@gmail.com'],
```

7. Di Google Spreadsheet, **Share** → beri akun bendahara akses **Editor**.

⚠️ Google Cloud Console **mengunduh file `client_secret_*.json` otomatis** setelah client
dibuat, sering ke folder proyek. File itu berisi rahasia dan **tidak boleh masuk repo** —
sudah dicegah lewat `.gitignore`, tapi periksa `git status` sebelum commit. Aplikasi ini
tidak memakainya sama sekali; hanya Client ID yang dipakai, dan Client ID memang publik.

</details>

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
| Browser memperingatkan "Not secure" di `kas-alhuda.my.id` | Sertifikat HTTPS belum terbit. Lihat bagian di bawah |

## Catatan domain & HTTPS

Situs dilayani GitHub Pages di domain `kas-alhuda.my.id` (terdaftar di IDwebhost).

**DNS yang terpasang** (di IDwebhost → Domain → Kelola DNS):

| Host | Tipe | Nilai |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `www` | CNAME | `belvahector-ship-it.github.io` |

`www.kas-alhuda.my.id` otomatis dialihkan ke `kas-alhuda.my.id`.

**Sertifikat HTTPS** diterbitkan GitHub secara otomatis (Let's Encrypt) setelah DNS check
selesai — biasanya beberapa menit, kadang sampai satu jam. Selama itu situs hanya bisa
diakses lewat `http://`. Setelah sertifikat terbit, aktifkan centang **Enforce HTTPS** di
*Settings → Pages* agar semua pengunjung dipaksa ke `https://`.

**Kalau nanti mengganti domain lagi**, ada tiga tempat yang harus ikut diubah — melewatkan
salah satunya adalah penyebab paling umum mode edit tiba-tiba rusak:
1. File `CNAME` di root repo.
2. *Settings → Pages → Custom domain* di GitHub.
3. **Authorized JavaScript origins** di Google Cloud Console (OAuth).
