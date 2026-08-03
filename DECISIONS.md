# DECISIONS.md — Kas Kelas 1B SD Islam Al Huda

Log keputusan proyek. **Append-only.** Kalau keputusan lama dibatalkan, tulis entri baru
yang menggantikan — jangan hapus riwayatnya.

---

## 2026-08-03 · CP-01 — Discovery (dipadatkan)

Permintaan user sudah cukup spesifik, jadi Discovery dipangkas jadi satu putaran.

**Diketahui dari user:**
- Web **statis, 1 halaman**, menampilkan data spreadsheet kas kelas.
- Sumber data: Google Spreadsheet `1LVg64_HIVvZk2HReb08HB3LB-K_48qpqXxECAxca-Qo`
  (isinya identik dengan file `DATA KAS KELAS 1B SD ISLAM AL HUDA.xlsx`).
- Konsep meniru repo `belvahector-ship-it/kas-rt-sampangan` (portal transparansi kas).
- **Login Gmail** untuk mengaktifkan mode edit/input data.
- Desain **neo brutalist**.
- **Full animasi scroll down**.
- Dikerjakan cepat & efisien.

**Asumsi yang diambil (belum dikonfirmasi user — silakan koreksi):**

| # | Asumsi | Alasan |
|---|---|---|
| A1 | Bahasa UI **Indonesia penuh**, tanpa layer i18n | Audiens wali murid kelas 1 SD |
| A2 | Pengunjung umum boleh **melihat** semua data tanpa login | Tujuannya transparansi, sama seperti repo referensi |
| A3 | Yang boleh **mengedit** hanya bendahara/wali kelas | Login Gmail dipakai sebagai gerbang edit |
| A4 | Nominal iuran seragam **Rp15.000/bulan/siswa** | Semua baris kolom "Pagu Iuran" = 15000 |
| A5 | Tahun ajaran berjalan **Juli 2026 – Juni 2027** (12 bulan) | Header kolom di sheet |
| A6 | Hosting **GitHub Pages** (statis, gratis) | User menyebut mau bikin repo git |
| A7 | Tidak ada halaman lain (laporan/kegiatan terpisah) | User minta eksplisit "1 halaman saja" |

**Verifikasi data (dihitung ulang dari Excel, bukan dari kolom total yang sudah ada):**
- 28 siswa × 12 bulan; 161 sel terbayar → **pemasukan Rp2.415.000**
- 5 transaksi pengeluaran → **Rp755.000**
- **Saldo Rp1.660.000** → cocok dengan kolom `Net` baris terakhir di sheet `REKAP KAS`. Data konsisten.

**Catatan cacat data yang ditemukan** (tidak diperbaiki di sheet, hanya diakali di web):
- Kolom `Total pengeluaran` (H) di sheet `REKAP KAS` kumulatifnya putus di baris ke-5
  (60k → 90k → 165k → 594k → **161k**, seharusnya 755k).
- Kolom `Pemasukan Per Bulan` (C) dan `TOTAL KAS MASUK` (D) diisi manual dan tidak konsisten
  antar baris.
- → **Keputusan:** website **tidak memakai kolom C, D, H, I**. Semua total dihitung ulang
  di browser dari data mentah (centang `v` dan nominal pengeluaran). Angka di web jadi
  selalu benar meski sheet-nya berantakan.

---

## 2026-08-03 · CP-02 — Stack & arsitektur

**Keputusan: statis murni — HTML + CSS + JS vanilla. Tanpa build step, tanpa framework, tanpa backend.**

Alasan: satu halaman, data kecil (28×12 sel), harus bisa di-host di GitHub Pages, dan user
minta cepat. React/Vite di sini cuma menambah berat dan langkah deploy tanpa manfaat.

**Alur data — tiga lapis, jatuh berurutan:**

1. **Baca publik** lewat Google Visualization API
   (`/gviz/tq?tqx=out:json&sheet=...`). Tidak perlu API key, tidak perlu login, asal
   spreadsheet di-share "anyone with the link can view". Sudah diuji: `HTTP 200`, struktur terbaca.
2. **Fallback `data/snapshot.json`** — hasil ekspor dari file `.xlsx`. Dipakai kalau sheet
   di-private, offline, atau gviz down. Artinya web **tetap tampil benar walau belum dikonfigurasi apa pun**.
3. **Tulis** lewat Google Sheets API v4 (`values.update` / `batchUpdate`) memakai OAuth
   access token dari Google Identity Services. Hanya aktif di mode edit.

**Ditolak — alternatif yang dipertimbangkan:**
- *Google Apps Script sebagai proxy tulis* — repo referensi punya folder `apps-script/`.
  Ditolak: menambah satu komponen yang harus di-deploy & di-maintain terpisah, dan
  Apps Script Web App yang "execute as owner" justru membuat **siapa pun** bisa menulis
  kalau URL-nya bocor. Menulis langsung dengan token si user lebih aman: Google sendiri
  yang mengecek apakah orang itu punya izin edit.
- *localStorage saja untuk mode edit* — ditolak, editan tidak terlihat orang lain,
  jadi tidak menyelesaikan permintaan "input data yg tampil di web".
- *Backend Node/Express* — ditolak, user minta statis.

---

## 2026-08-03 · CP-03 — Model keamanan login Gmail

**Keputusan: whitelist email di `config.js` hanya untuk UX. Gerbang keamanan sesungguhnya
adalah izin edit di Google Spreadsheet itu sendiri.**

Ini penting dan mudah disalahpahami, jadi ditulis eksplisit: `ADMIN_EMAILS` ada di file
JS yang bisa dibaca siapa saja. Orang bisa mengakalinya lewat DevTools dan memunculkan
tombol edit. **Tapi tombol itu tidak akan berfungsi** — saat menyimpan, Google Sheets API
menolak dengan 403 kecuali akun Google tersebut memang diberi akses Editor pada
spreadsheet-nya.

Jadi: whitelist = menyembunyikan tombol dari orang yang tidak berkepentingan.
Sharing setting spreadsheet = keamanan yang sebenarnya. **Jangan share spreadsheet
sebagai "Anyone with the link can edit".**

Scope OAuth yang diminta: `openid email profile https://www.googleapis.com/auth/spreadsheets`.
Token disimpan di memori saja (bukan localStorage) — hilang saat tab ditutup, mengurangi
risiko token dicuri lewat XSS.

---

## 2026-08-03 · CP-04 — Desain: neo brutalism

Token lengkap ada di `assets/css/style.css` (`:root`). Ringkasnya:

| Aspek | Keputusan | Alasan |
|---|---|---|
| Border | `3px solid #0B0B0B` di semua kartu | Ciri utama neo brutalism |
| Bayangan | Hard offset `6px 6px 0 #0B0B0B`, tanpa blur | Blur = soft/material, bukan brutalist |
| Radius | `0` (kecuali pill pada badge) | Sudut tajam |
| Warna | Kuning `#FFD84D` primer, lime/cyan/pink/oranye sebagai aksen blok | Kontras tinggi, ceria — cocok kelas 1 SD |
| Font | `Archivo Black` (display) + `Space Grotesk` (teks) via Google Fonts, `display=swap` | Grotesk tebal khas brutalist; ada fallback sistem kalau font gagal dimuat |
| Latar | `#FFFDF5` + grid halus | Menghindari putih klinis |
| Hover | Kartu/tombol geser `-3px,-3px`, bayangan membesar | Efek "tombol fisik" |

**Alasan memilih warna sebagai penanda status** (lunas/belum): warna saja tidak cukup
untuk pengguna buta warna, jadi setiap sel juga punya **simbol** (`✓` / `·`) dan
`aria-label` teks. Warna cuma lapisan kedua.

---

## 2026-08-03 · CP-05 — Animasi scroll

**Keputusan: semua animasi hanya memakai `transform` dan `opacity`, durasi 400–700ms,
dipicu `IntersectionObserver`.**

Alasan: dua properti itu bisa dianimasikan GPU tanpa memicu layout/paint ulang. Wali murid
kemungkinan besar membuka ini dari Android kelas menengah lewat WhatsApp — menganimasikan
`height`, `top`, atau `box-shadow` akan terasa patah-patah di sana.

Yang dianimasikan:
- Reveal per seksi & per baris tabel (`translateY(28px)` → `0`), dengan stagger via `--d`.
- Angka KPI count-up saat masuk viewport.
- Bar chart tumbuh via `transform: scaleY()` — **bukan** `height`, supaya tidak reflow.
- Marquee teks berjalan.
- Progress bar scroll di atas layar.
- Hero blob berputar mengikuti scroll (`requestAnimationFrame`, transform saja).

`prefers-reduced-motion: reduce` mematikan semuanya dan menampilkan konten langsung —
bukan sekadar mempercepat. Ini kebutuhan aksesibilitas nyata (vestibular disorder),
bukan formalitas.

**Ditolak:** library animasi (AOS, GSAP, Framer Motion). ~30 baris IntersectionObserver
menggantikan 40KB+ JS pihak ketiga untuk kebutuhan sesederhana ini.

---

## 2026-08-03 · CP-06 — Utang teknis & batasan yang diketahui

Ditulis jujur di sini dan di `README.md`, bukan didiamkan:

1. **Login belum bisa dipakai sampai user mengisi `assets/js/config.js`** dengan OAuth
   Client ID dari Google Cloud Console. Sebelum diisi, tombol edit menampilkan panduan,
   bukan error. Mode baca tetap jalan normal.
2. **Tidak ada riwayat perubahan / audit log** siapa mengubah apa. Kalau nanti perlu,
   Google Sheets punya "Version history" bawaan sebagai penambal sementara.
3. **Menulis satu sel = satu request.** Aman untuk skala ini (28×12). Kalau nanti kelasnya
   banyak, perlu digabung jadi `values:batchUpdate`.
4. **Tidak ada penguncian bersamaan.** Kalau dua bendahara mengedit bersamaan, yang
   terakhir menyimpan menang. Risiko kecil untuk 1–2 pengguna.
5. **Nama bulan pengeluaran diisi manual** lewat dropdown, tidak diturunkan dari tanggal —
   karena sheet aslinya memang menyimpannya sebagai teks bebas.
6. **Kolom C, D, H, I di sheet `REKAP KAS` akan makin tidak sinkron** dengan angka web,
   karena web tidak menulis ke sana (lihat CP-01). Disengaja: web adalah sumber angka
   yang benar, sheet adalah sumber data mentah.

---

## 2026-08-03 · CP-07 — Hasil QA & perbaikan yang lahir darinya

Dijalankan sungguhan di browser pada 360 / 768 / 1440px, bukan diasumsikan. Empat cacat
ditemukan dan diperbaiki:

1. **Scroll horizontal 19px.** Pita marquee dimiringkan `rotate(-1deg) scale(1.03)`
   sehingga sudutnya menonjol dan menambah lebar dokumen.
   → Dibungkus `.marquee-wrap { overflow: hidden }`. Ditambah `overflow-x: clip` pada
   `<html>` — sengaja `clip`, bukan `hidden`, karena `hidden` pada `<html>` akan
   mematikan `position: sticky` pada nav.

2. **Semua angka diam di Rp0.** `IntersectionObserver` sudah menembak elemen KPI saat
   halaman pertama dimuat — waktu itu `data-count` masih `0` karena data dari Google
   Sheet belum tiba. Elemen ditandai "sudah tampil" dan tidak pernah dianimasikan lagi.
   → Atribut `data-count="0"` dihapus dari HTML, dan `setCount()` sekarang memeriksa:
   kalau elemennya sudah terlihat, animasikan sekarang juga; kalau belum, serahkan ke observer.

3. **Angka bisa tetap Rp0 walau data sudah ada.** Ini yang paling berbahaya karena
   diam-diam: nilai benar hanya ditulis oleh animasi count-up, sedangkan count-up
   memakai `requestAnimationFrame` — yang **dibekukan browser di tab latar belakang**,
   dan juga tidak jalan saat halaman dicetak.
   → **Nilai yang benar sekarang selalu ditulis ke DOM lebih dulu.** Count-up murni
   hiasan di atasnya. Prinsipnya: animasi tidak boleh menjadi satu-satunya jalan
   sebuah informasi sampai ke pengguna.

4. **Target sentuh 40px** pada tombol `.btn--sm` di nav dan sel tabel `.cellbtn`.
   → Dinaikkan ke 44px. Tabel jadi lebih tinggi, tapi sel itu memang bisa diklik di
   mode edit jadi harus memenuhi ukuran minimum.

**Terverifikasi setelah perbaikan:** 28 siswa terbaca live dari Google Sheet · 161
pembayaran · Rp2.415.000 masuk · Rp755.000 keluar · saldo Rp1.660.000 (cocok dengan
kolom `Net` di sheet) · snapshot cadangan menghasilkan angka identik · pencarian &
filter benar · klik sel tanpa login tidak mengubah apa pun · tidak ada scroll
horizontal di 360/768/1440 · tidak ada error di konsol.

**Utang yang sengaja dibiarkan:** di layar ≤860px menu navigasi disembunyikan tanpa
tombol hamburger pengganti. Alasan: halamannya satu layar panjang dan hero sudah punya
dua tombol menuju bagian terpenting. Menambah menu geser untuk empat tautan pada
halaman tunggal lebih banyak menambah kerumitan daripada manfaat. Kalau nanti bagiannya
bertambah, ini yang pertama perlu ditinjau ulang.

---

## 2026-08-03 · CP-08 — Privasi: nama lengkap siswa di halaman publik

**Keputusan user:** halaman tetap menampilkan **nama lengkap** 28 siswa dan status
tunggakan keluarganya, dan repo dipasang **publik** di GitHub Pages.

**Risiko yang diangkat sebelum diputuskan:** halaman ini memasangkan nama anak kelas 1 SD
dengan kondisi finansial keluarganya. Kalau terindeks mesin pencari, menelusuri nama anak
bisa memunculkan fakta bahwa keluarganya menunggak. Itu jauh melampaui niat awalnya —
transparansi ke sesama wali murid kelas — dan yang terdampak adalah pihak yang tidak
pernah dimintai persetujuan.

**Penyeimbang yang dipasang:**
- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` di `index.html`
- `robots.txt` dengan `Disallow: /`

Jadi halaman terbuka bagi siapa pun yang **punya tautannya**, tapi tidak muncul di hasil
pencarian Google. Ini menutup jalur "orang asing menemukannya tanpa sengaja", bukan
"orang yang punya tautan bisa membukanya".

**Yang masih terbuka, supaya jelas:** siapa pun yang mendapat tautannya — dari grup
WhatsApp yang di-forward, misalnya — bisa melihat semuanya. `noindex` adalah permintaan
sopan yang dipatuhi Google dan Bing, bukan penguncian.

**Kalau nanti berubah pikiran**, dua langkah yang paling murah:
1. Tampilkan nama singkat di web (`Ahmad Abidzar Z. M.`) sementara spreadsheet tetap
   lengkap — ubah di fungsi render tabel, tidak menyentuh sumber data.
2. Jadikan repo private dan bagikan file HTML-nya langsung ke wali murid.

---

## 2026-08-03 · CP-09 — Migrasi ke domain sendiri `kas-alhuda.my.id`

**Keputusan:** situs dipindah dari `belvahector-ship-it.github.io/kas-kelas-1b-sd-alhuda/`
ke **`https://kas-alhuda.my.id`** (domain milik sendiri di IDwebhost, aktif s/d 03/08/2027).
Hosting tetap GitHub Pages — yang berubah hanya alamatnya.

**DNS yang dipasang** (nameserver tetap `ns1/ns2.idwebhost.id`):

| Host | Tipe | Nilai |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `www` | CNAME | `belvahector-ship-it.github.io` |

**Kenapa hanya 2 A record, bukan 4?** GitHub menganjurkan keempat IP-nya
(`185.199.108–111.153`) untuk redundansi. Panel DNS IDwebhost menolak record ketiga
dengan pesan *"A record having same details already exists"* — panelnya membatasi jumlah
A record per host. Dua IP tetap berfungsi penuh karena masing-masing IP GitHub sudah
anycast (satu alamat dilayani banyak lokasi), jadi yang hilang hanya lapisan cadangan
kalau salah satu IP itu bermasalah. Risikonya kecil dan dampaknya bukan kehilangan data.
Kalau nanti IDwebhost memperbaiki panelnya, tambahkan `.110.153` dan `.111.153`.

**Jebakan panel IDwebhost yang perlu diingat** (memakan waktu paling lama saat migrasi):
tombol **Simpan di dalam modal "Add DNS Record" tidak menyimpan ke server** — ia hanya
menambahkan baris tersembunyi ke form `#form-dns` di halaman. Penyimpanan sesungguhnya
terjadi saat form itu ter-submit. Akibatnya modal terlihat "tidak merespons" padahal
record sebenarnya sudah masuk antrean, dan record bisa tersimpan tanpa pesan sukses.
**Selalu muat ulang halaman Kelola DNS untuk melihat kondisi sebenarnya**, jangan percaya
tampilan modal.

**File `CNAME`** berisi `kas-alhuda.my.id` ditambahkan ke root repo. Ini yang memberi tahu
GitHub Pages domain kustomnya. Sengaja disimpan sebagai file di repo, bukan hanya diatur
lewat Settings → Pages, supaya pengaturannya ikut ter-versioning dan tidak hilang kalau
Pages dinonaktifkan lalu diaktifkan lagi.

**Terverifikasi setelah migrasi** (diuji dengan permintaan HTTP sungguhan, bukan dari
tampilan panel):

| Alamat diuji | Hasil |
|---|---|
| `http://kas-alhuda.my.id` | 200 → dialihkan ke `https://kas-alhuda.my.id/` |
| `http://www.kas-alhuda.my.id` | 200 → dialihkan ke `https://kas-alhuda.my.id/` |
| `https://kas-alhuda.my.id` | 200, konten benar |
| `belvahector-ship-it.github.io/kas-kelas-1b-sd-alhuda/` (alamat lama) | 200 → dialihkan ke domain baru |
| `https://kas-alhuda.my.id/robots.txt` | terlayani, `Disallow: /` utuh |

Sertifikat Let's Encrypt terbit ±10 menit setelah DNS check lolos, lalu **Enforce HTTPS**
diaktifkan sehingga `http://` selalu dipaksa ke `https://`.

**Konsekuensi yang harus diikuti:** `OAUTH_CLIENT_ID` di Google Cloud Console harus
memasukkan `https://kas-alhuda.my.id` pada **Authorized JavaScript origins**. Kalau tidak,
mode edit akan gagal dengan `redirect_uri_mismatch` di domain baru meski berhasil di
alamat lama.

---

## 2026-08-03 · CP-10 — Kontak di halaman & mode edit diaktifkan

**Penempatan kontak — keputusan user, dan alasannya masuk akal:**
- **Kontak bendahara** (Rahma Puji Rahayu / Mama Shireen, WA 0811-3981-9222) diletakkan
  sebagai **kartu besar di section terakhir**, bukan di footer. Alasannya: inilah tindakan
  yang paling mungkin dibutuhkan wali murid setelah melihat tabel — orang jarang mencari
  kontak di footer.
- **Kredit & kontak pengelola web** (iBelva-Studios / Ayah Shireen, WA 0851-6321-0987,
  BelvaFahrozi@unw.ac.id) diletakkan di **footer paling bawah dengan font kecil**, supaya
  tidak bersaing dengan kontak bendahara.

Link WhatsApp memakai `wa.me` dengan pesan siap-kirim (`?text=`) yang berbeda untuk
masing-masing: wali murid membuka percakapan soal kas, pelapor bug membuka percakapan soal
kendala teknis. Nomor `+62085163210987` yang diberikan formatnya campur (+62 dengan 0 di
depan); dikonfirmasi ke user dan dibaca sebagai `0851-6321-0987` → `wa.me/6285163210987`.

**Mode edit sekarang aktif.** Yang disiapkan di Google Cloud (project `kas-kelas-1b-al-huda`,
dimiliki `belvahector@gmail.com`):

| Item | Nilai |
|---|---|
| Google Sheets API | Enabled |
| Consent screen | External, status **Testing** |
| Test user | `rahmapujirahayu309@gmail.com` — satu-satunya |
| Authorized JS origins | `kas-alhuda.my.id`, `www.kas-alhuda.my.id`, `belvahector-ship-it.github.io`, `localhost:8000` |
| `ADMIN_EMAILS` | `rahmapujirahayu309@gmail.com` |

**Sekarang ada tiga lapis penjaga, bukan satu** — ini kebetulan yang bagus dan sebaiknya
dipertahankan:
1. `ADMIN_EMAILS` di config — menyembunyikan tombol (kosmetik, bisa diakali).
2. Consent screen berstatus **Testing** — Google menolak login akun yang tidak terdaftar
   sebagai Test user, di sisi server. Ini lapisan yang **tidak** bisa diakali dari browser.
3. Izin **Editor** di spreadsheet — penentu akhir apakah tulisan diterima.

**Temuan penting soal kepemilikan spreadsheet:** akun `belvahector@gmail.com` ternyata hanya
punya akses **View only** pada spreadsheet dan hanya bisa "Ask to share". Artinya pemiliknya
orang lain — kemungkinan besar Bu Rahma sendiri, yang berarti dia sudah punya hak tulis
penuh tanpa perlu perubahan apa pun. **Belum terverifikasi** karena tidak bisa dicek dari
akun yang aksesnya terbatas. Kalau nanti muncul error `403` saat menyimpan, inilah yang
pertama harus diperiksa.

Akses umum spreadsheet saat ini: **"Anyone with the link → Viewer"** — tepat seperti yang
dibutuhkan (web bisa membaca publik) dan aman (bukan Editor).

**Insiden kecil yang perlu diingat:** saat OAuth client dibuat, Google Cloud Console
**mengunduh file `client_secret_*.json` otomatis ke folder proyek**, dan file itu ikut
tersapu `git add .`. Push ditolak GitHub push protection. File dipindahkan keluar repo ke
`C:\Users\Shireen\Downloads\`, commit diulang, dan pola `client_secret*.json` ditambahkan ke
`.gitignore`. Secret itu **tidak pernah terkirim ke GitHub**. Aplikasi ini tidak memakai
client secret sama sekali — alur token di browser hanya butuh Client ID, yang memang
dirancang untuk publik.

---

## Cara menambah entri baru

```markdown
## YYYY-MM-DD · CP-NN — Judul singkat
**Keputusan:** ...
**Alasan:** ...
**Konsekuensi / yang jadi terbatas:** ...
```
