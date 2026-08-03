# SPEC — Portal Transparansi Kas Kelas 1B

**SD Islam Al Huda · Tahun Ajaran 2026/2027**

---

## 1. Tujuan

Wali murid bisa mengecek status iuran kas kelas **tanpa bertanya ke bendahara**, kapan saja,
dari HP. Bendahara bisa mencentang pembayaran dan mencatat pengeluaran langsung dari web
tanpa membuka spreadsheet.

**Satu hal terpenting yang dilakukan pengunjung:** mencari nama anaknya, lalu melihat bulan
mana yang sudah dan belum dibayar.

Semua keputusan desain di bawah tunduk pada kalimat itu. Kalau sebuah fitur tidak membantu
orang menemukan nama anaknya lebih cepat, fitur itu tidak masuk versi ini.

## 2. Pengguna

| Peran | Bisa apa | Otentikasi |
|---|---|---|
| Wali murid / umum | Lihat semua data | Tidak perlu login |
| Bendahara / wali kelas | Lihat + centang iuran + catat pengeluaran | Login Google, harus punya izin Editor di spreadsheet |

## 3. Ruang lingkup

**Termasuk:** satu halaman (`index.html`) berisi ringkasan saldo, grafik pemasukan bulanan,
tabel iuran 28 siswa × 12 bulan, jurnal pengeluaran, dan mode edit.

**Tidak termasuk (versi ini):** halaman terpisah, ekspor PDF, notifikasi WhatsApp, multi-kelas,
riwayat perubahan, kas selain iuran bulanan.

## 4. Sumber data

Google Spreadsheet `1LVg64_HIVvZk2HReb08HB3LB-K_48qpqXxECAxca-Qo`, dua sheet:

### Sheet `TABEL IURAN`
Baris 1–3 = judul & header. Data siswa mulai **baris 4** sampai baris 31 (28 siswa).
Baris 32 = total (diabaikan web, dihitung ulang).

| Kolom | Isi |
|---|---|
| A | No urut |
| B | Nama siswa |
| C | Pagu iuran (15000) |
| D – O | JULI … JUNI — berisi `v` bila lunas, kosong bila belum |

→ Sel bulan siswa ke-`i` (0-based) ada di baris `i + 4`, kolom `D + bulanIndex`.

### Sheet `REKAP KAS`
Baris 1–3 = judul & header. Data mulai **baris 4**.

| Kolom | Isi | Dipakai web? |
|---|---|---|
| A | No urut | tidak |
| B | Bulan | **ya** |
| C | Pemasukan per bulan | tidak — tidak konsisten |
| D | Total kas masuk | tidak — tidak konsisten |
| E | Tanggal | **ya** |
| F | Nominal pengeluaran | **ya** |
| G | Keterangan | **ya** |
| H | Total pengeluaran kumulatif | ditulis ulang saat simpan |
| I | Net | ditulis ulang saat simpan |

## 5. Aturan hitung (semua di browser, bukan dari sheet)

```
totalMasuk    = jumlah sel bertanda 'v' × 15.000
totalKeluar   = Σ kolom F sheet REKAP KAS
saldo         = totalMasuk − totalKeluar
tunggakanAnak = (bulan berjalan − bulan lunas) × 15.000
progresLunas  = sel lunas / (28 × 12)
```

Alasan tidak memakai total yang sudah ada di sheet: kolom-kolom itu diisi manual dan
sudah terbukti salah (lihat DECISIONS CP-01).

**Angka acuan saat spec ini ditulis:** masuk `Rp2.415.000` · keluar `Rp755.000` ·
saldo `Rp1.660.000`.

## 6. Alur pengguna

**Wali murid (jalur utama — 3 langkah):**
1. Buka link → hero langsung menampilkan **saldo kas**.
2. Scroll / klik "Cek Iuran" → tabel iuran.
3. Ketik nama anak di kotak cari → barisnya tersorot, terlihat bulan mana yang kosong.

**Bendahara (mode edit):**
1. Klik `MODE EDIT` → popup Google → pilih akun.
2. Email dicek terhadap whitelist → badge "MODE EDIT AKTIF" muncul.
3. Klik sel bulan → berubah lunas/belum, langsung tersimpan ke spreadsheet.
4. Isi form pengeluaran → tersimpan sebagai baris baru di `REKAP KAS`.
5. Klik `KELUAR` → token dibuang, kembali ke mode baca.

## 7. Susunan halaman (wireframe teks)

```
[ progress bar scroll — 4px, kuning ]
[ NAV sticky: logo blok kuning · menu · tombol MODE EDIT ]

[ HERO ]  kiri 55%: label tahun ajaran, judul raksasa "KAS KELAS 1B",
          subjudul, 2 tombol.
          kanan 45%: kartu SALDO miring −1.5°, angka count-up besar,
          2 baris kecil masuk/keluar. Blob kuning berputar di belakang.

[ MARQUEE ] pita hitam teks berjalan, miring −1°

[ RINGKASAN ] 4 kartu warna: Kas Masuk · Kas Keluar · Saldo · Lunas Penuh
              + bar progres pembayaran keseluruhan

[ GRAFIK ]   12 batang vertikal per bulan, tumbuh saat masuk layar,
             label bulan miring di bawah, tooltip nominal

[ TABEL IURAN ] kotak cari + 3 chip filter (Semua / Lunas / Nunggak)
                tabel: kolom nama sticky di kiri, 12 kolom bulan,
                kolom Lunas & Tunggakan di kanan.
                sel: ✓ hijau = lunas, · abu = belum
                mobile: scroll horizontal

[ PENGELUARAN ] daftar kartu transaksi (tanggal, keterangan, nominal)
                + form tambah (hanya mode edit)

[ FOOTER ] catatan sumber data, waktu perbarui, tombol buka spreadsheet
```

## 8. Kontrak API (Google)

**Baca — publik, tanpa key:**
```
GET https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&sheet={NAMA_SHEET}
→ 200, body diawali ")]}'" / "/*O_o*/" — harus dipotong sebelum JSON.parse
```

**Login:**
```
google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets'
})
GET https://www.googleapis.com/oauth2/v3/userinfo   Authorization: Bearer <token>
→ { email, name, picture }
```

**Tulis satu sel iuran:**
```
PUT https://sheets.googleapis.com/v4/spreadsheets/{ID}/values/'TABEL IURAN'!{col}{row}
    ?valueInputOption=RAW
    Authorization: Bearer <token>
    body: { values: [["v"]] }        // atau [[""]] untuk membatalkan
→ 200 ok · 401 token kedaluwarsa · 403 tidak punya izin edit
```

**Tulis pengeluaran baru:**
```
PUT .../values/'REKAP KAS'!B{row}:I{row}?valueInputOption=RAW
    body: { values: [[bulan, "", "", tanggal, jumlah, keterangan, kumulatif, net]] }
```
`{row}` = baris kosong pertama (kolom F kosong), mulai dari 4.

## 9. Kriteria selesai

- [x] Halaman tampil benar **tanpa konfigurasi apa pun** (pakai snapshot.json)
- [x] Angka saldo cocok dengan perhitungan manual dari Excel (Rp1.660.000)
- [x] Tidak ada scroll horizontal di lebar 360px
- [x] Semua target sentuh ≥ 44px
- [x] `prefers-reduced-motion` mematikan animasi
- [x] Status lunas/belum dibedakan simbol, bukan warna saja
- [x] Mode edit menampilkan panduan (bukan error) bila belum dikonfigurasi
