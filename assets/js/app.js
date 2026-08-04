/* =========================================================================
   KAS KELAS 1B — logika aplikasi
   Tanpa framework, tanpa build step. Lihat DECISIONS.md CP-02.
   ========================================================================= */
(function () {
'use strict';

const CFG = window.CONFIG;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Bulan tahun ajaran → bulan kalender (Juli = 6). Dipakai untuk menghitung
   bulan mana yang sudah lewat, supaya "tunggakan" bukan angka asal. */
const MONTH_CAL = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];

const state = {
  meta: null,
  bulan: [],
  siswa: [],
  pengeluaran: [],
  source: 'snapshot',
  elapsed: 12,
  filter: 'all',
  query: '',
  token: null,
  user: null,
};

/* ---------- util ---------- */
const rupiah  = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const ringkas = n => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + ' jt'
               : n >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(n);

function colLetter(i) {                 // 0 → A, 3 → D, 26 → AA
  let s = '';
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
  return s;
}
const FIRST_MONTH_IDX = CFG.COL_FIRST_MONTH.charCodeAt(0) - 65;

function toast(msg, kind = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = 'toast toast--' + kind;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

/* =========================================================================
   1. AMBIL DATA
   Tiga lapis: Google Sheet (live) → snapshot.json → pesan error jujur.
   ========================================================================= */

function parseGviz(text) {
  const m = text.match(/setResponse\(([\s\S]*?)\);?\s*$/);
  if (!m) throw new Error('Format balasan Google Sheet tidak dikenali');
  const table = JSON.parse(m[1]).table;
  // Normalkan jadi array 2 dimensi berisi nilai mentah.
  return table.rows.map(r => (r.c || []).map(c => (c && c.v !== null && c.v !== undefined) ? c.v : ''));
}

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/gviz/tq`
            + `?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CFG.FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return parseGviz(await res.text());
  } finally { clearTimeout(timer); }
}

const isPaid = v => String(v == null ? '' : v).trim() !== '';

async function loadLive() {
  const [iuranRows, kasRows] = await Promise.all([
    fetchSheet(CFG.SHEET_IURAN),
    fetchSheet(CFG.SHEET_KAS),
  ]);

  const siswa = [];
  iuranRows.forEach((row, i) => {
    const nama = String(row[1] || '').trim();
    // Baris "Total Keseluruhan" tidak punya nomor urut → otomatis tersaring.
    if (!nama || typeof row[0] !== 'number') return;
    siswa.push({
      no: Math.round(row[0]),
      nama,
      pagu: Number(row[2]) || CFG.IURAN_PER_BULAN,
      bayar: Array.from({ length: 12 }, (_, m) => isPaid(row[3 + m])),
      row: CFG.ROW_START_IURAN + i,
    });
  });
  if (!siswa.length) throw new Error('Tidak ada baris siswa yang terbaca');

  const pengeluaran = [];
  let firstEmptyKasRow = null;
  kasRows.forEach((row, i) => {
    const jumlah = Number(row[5]) || 0;
    if (jumlah > 0) {
      pengeluaran.push({
        bulan: String(row[1] || '').trim(),
        tanggal: Number(row[4]) || 0,
        jumlah,
        keterangan: String(row[6] || '').trim() || 'Tanpa keterangan',
        row: CFG.ROW_START_KAS + i,
      });
    } else if (firstEmptyKasRow === null) {
      firstEmptyKasRow = CFG.ROW_START_KAS + i;
    }
  });

  return {
    meta: { sekolah: 'SD Islam Al Huda', kelas: '1B', tahunAjaran: '2026/2027', pagu: CFG.IURAN_PER_BULAN },
    bulan: ['JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER','JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI'],
    siswa,
    pengeluaran,
    nextKasRow: firstEmptyKasRow ?? (CFG.ROW_START_KAS + kasRows.length),
    source: 'live',
  };
}

async function loadSnapshot() {
  const res = await fetch('data/snapshot.json?_=' + Date.now());
  if (!res.ok) throw new Error('snapshot.json tidak ditemukan (HTTP ' + res.status + ')');
  const d = await res.json();
  const lastRow = d.pengeluaran.length ? Math.max(...d.pengeluaran.map(p => p.row)) : CFG.ROW_START_KAS - 1;
  return { ...d, nextKasRow: lastRow + 1, source: 'snapshot' };
}

async function loadData() {
  if (CFG.USE_LIVE_SHEET) {
    try { return await loadLive(); }
    catch (err) {
      console.warn('[kas] gagal baca Google Sheet, pakai snapshot:', err.message);
      const snap = await loadSnapshot();
      toast('Google Sheet tidak terbaca — menampilkan data cadangan.', 'info', 6000);
      return snap;
    }
  }
  return loadSnapshot();
}

/* =========================================================================
   2. HITUNGAN
   Semua total dihitung ulang di sini, bukan diambil dari kolom total sheet
   (kolom itu sudah terbukti tidak konsisten — lihat DECISIONS CP-01).
   ========================================================================= */

function monthsElapsed() {
  const now = new Date();
  const startYear = parseInt(String(state.meta?.tahunAjaran || '2026').slice(0, 4), 10) || 2026;
  let n = 0;
  for (let i = 0; i < 12; i++) {
    const y = startYear + (i < 6 ? 0 : 1);
    if (new Date(y, MONTH_CAL[i], 1) <= now) n = i + 1;
  }
  return Math.max(1, n);
}

function stats() {
  const pagu = CFG.IURAN_PER_BULAN;
  const perBulan = Array(12).fill(0);
  let sel = 0, lunasPenuh = 0;

  state.siswa.forEach(s => {
    let paid = 0;
    s.bayar.forEach((b, i) => { if (b) { perBulan[i]++; paid++; sel++; } });
    s.lunasCount = paid;
    s.tunggakan  = s.bayar.slice(0, state.elapsed).filter(b => !b).length * pagu;
    if (paid === 12) lunasPenuh++;
  });

  const masuk  = sel * pagu;
  const keluar = state.pengeluaran.reduce((a, p) => a + p.jumlah, 0);
  return {
    perBulan: perBulan.map(c => c * pagu),
    perBulanCount: perBulan,
    sel, totalSel: state.siswa.length * 12,
    masuk, keluar, saldo: masuk - keluar,
    lunasPenuh,
    rate: state.siswa.length ? sel / (state.siswa.length * 12) : 0,
  };
}

/* =========================================================================
   3. ANIMASI
   Hanya transform + opacity (DECISIONS CP-05).
   ========================================================================= */

/* Angka menghitung naik saat kartunya masuk layar. */
function countUp(el, target, fmt) {
  // Tab tersembunyi → requestAnimationFrame dibekukan browser. Tanpa penjagaan
  // ini, angka akan diam di Rp0 kalau halaman dibuka di tab latar belakang.
  if (REDUCED || document.hidden) { el.textContent = fmt(target); return; }
  const dur = 1100, t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  (function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(Math.round(target * ease(t)));
    if (t < 1) requestAnimationFrame(step);
  })(t0);
}

const revealed = new WeakSet();
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting || revealed.has(e.target)) return;
    revealed.add(e.target);
    e.target.classList.add('in');
    io.unobserve(e.target);

    // efek lanjutan per elemen
    if (e.target.dataset.count !== undefined) {
      const n = Number(e.target.dataset.count);
      countUp(e.target, n, e.target.dataset.raw === '1' ? String : rupiah);
    }
  });
}, { threshold: .16, rootMargin: '0px 0px -8% 0px' });

function observeAll() {
  $$('.reveal, .reveal-l, .reveal-r, .reveal-pop, [data-count]').forEach(el => {
    if (!revealed.has(el)) io.observe(el);
  });
}

/* Progress bar scroll + blob berputar. Satu rAF loop, transform saja. */
function initScrollFX() {
  const bar = $('#scrollbar'), b1 = $('#blob1'), b2 = $('#blob2');
  let ticking = false;
  function frame() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const y = scrollY;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (!REDUCED) {
      b1.style.transform = `rotate(${y * 0.05}deg) translateY(${y * 0.12}px)`;
      b2.style.transform = `rotate(${y * -0.09}deg)`;
    }
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();
}

/* =========================================================================
   4. RENDER
   ========================================================================= */

/* Data baru tiba setelah halaman dirender. Kalau elemennya sudah terlanjur
   terlihat (hero selalu begitu), animasikan sekarang juga — kalau belum,
   serahkan ke IntersectionObserver supaya count-up-nya tetap terasa. */
function setCount(sel, val, raw) {
  const el = $(sel);
  if (!el) return;
  el.dataset.count = val;
  if (raw) el.dataset.raw = '1';
  // Nilai benar SELALU ditulis lebih dulu. Kalau observer tidak pernah jalan
  // (tab latar belakang, JS animasi diblokir, halaman dicetak), yang terbaca
  // pengguna tetap angka yang benar — bukan Rp0. Count-up hanya hiasan.
  el.textContent = raw ? String(val) : rupiah(val);
  const r = el.getBoundingClientRect();
  if (r.top < innerHeight && r.bottom > 0) {
    revealed.add(el);
    countUp(el, val, raw ? String : rupiah);
  } else {
    revealed.delete(el);
    io.observe(el);
  }
}

function renderSummary(st) {
  const set = setCount;
  set('#heroSaldo', st.saldo); set('#heroIn', st.masuk); set('#heroOut', st.keluar);
  set('#kpiIn', st.masuk);     set('#kpiOut', st.keluar); set('#kpiSaldo', st.saldo);
  set('#kpiFull', st.lunasPenuh, true);

  $('#kpiInFoot').textContent  = `${st.sel} pembayaran × ${rupiah(CFG.IURAN_PER_BULAN)}`;
  $('#kpiOutFoot').textContent = `${state.pengeluaran.length} transaksi tercatat`;
  $('#kpiFullFoot').textContent = `dari ${state.siswa.length} siswa`;

  const pct = Math.round(st.rate * 100);
  $('#progressLabel').textContent = `${pct}% · ${st.sel} dari ${st.totalSel} bulan-siswa`;
  const fill = $('#progressFill');
  fill.style.setProperty('--p', st.rate);
  // Ditunda sedikit supaya transisinya terlihat, bukan langsung di posisi akhir.
  setTimeout(() => { fill.style.transform = `scaleX(${st.rate})`; }, REDUCED ? 0 : 420);
}

function renderChart(st) {
  const plot = $('#chartPlot'), labels = $('#chartLabels');
  const max = Math.max(...st.perBulan, 1);
  plot.innerHTML = ''; labels.innerHTML = '';

  state.bulan.forEach((b, i) => {
    const val = st.perBulan[i];
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `<span class="bar__val">${val ? ringkas(val) : '–'}</span>
                     <div class="bar__fill" style="height:${Math.max(3, (val / max) * 100)}%"></div>`;
    bar.title = `${b}: ${rupiah(val)} — ${st.perBulanCount[i]} siswa`;
    plot.appendChild(bar);

    const lb = document.createElement('span');
    lb.textContent = b.slice(0, 3);
    labels.appendChild(lb);
  });

  // Tumbuh bertahap saat grafik masuk layar (scaleY, bukan height → tanpa reflow).
  const grow = () => $$('.bar__fill', plot).forEach((f, i) => {
    setTimeout(() => { f.style.transform = 'scaleY(1)'; }, REDUCED ? 0 : i * 55);
  });
  const once = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { grow(); once.disconnect(); } });
  }, { threshold: .25 });
  once.observe($('#grafik'));

  const best = st.perBulan.indexOf(Math.max(...st.perBulan));
  $('#chartHint').textContent =
    `Pemasukan tertinggi di bulan ${state.bulan[best]} (${rupiah(st.perBulan[best])}). `
  + `Bulan berjalan: ${state.bulan[state.elapsed - 1]}.`;
}

function renderTableHead() {
  $('#theadRow').innerHTML =
    `<th class="sticky-l" scope="col">Nama Siswa</th>`
  + state.bulan.map(b => `<th scope="col">${b.slice(0, 3)}</th>`).join('')
  + `<th scope="col">Lunas</th><th scope="col">Status</th>`;
}

function renderTableBody() {
  const q = state.query.trim().toLowerCase();
  const tbody = $('#tbodyIuran');
  const rows = state.siswa.filter(s => {
    if (q && !s.nama.toLowerCase().includes(q)) return false;
    if (state.filter === 'lunas'   && s.lunasCount !== 12) return false;
    if (state.filter === 'nunggak' && s.tunggakan === 0)   return false;
    return true;
  });

  $('#emptyState').hidden = rows.length > 0;
  tbody.innerHTML = rows.map((s, idx) => {
    const cells = s.bayar.map((paid, m) => `
      <td class="sel">
        <button type="button" class="cellbtn ${paid ? 'cell cell--paid' : 'cell cell--unpaid'}"
                data-siswa="${s.no}" data-bulan="${m}"
                aria-label="${s.nama}, ${state.bulan[m]}: ${paid ? 'sudah dibayar' : 'belum dibayar'}"
                ${'' /* tombol hanya aktif di mode edit, dicek di handler */}>${paid ? '✓' : '·'}</button>
      </td>`).join('');

    const pill = s.lunasCount === 12 ? '<span class="pill pill--ok">LUNAS</span>'
               : s.tunggakan === 0   ? '<span class="pill pill--ok">AMAN</span>'
               : `<span class="pill ${s.tunggakan > 2 * CFG.IURAN_PER_BULAN ? 'pill--bad' : 'pill--warn'}">${rupiah(s.tunggakan)}</span>`;

    return `<tr class="reveal" style="--d:${Math.min(idx, 14) * 30}ms" data-row="${s.no}">
      <td class="sticky-l"><span class="nm"><span class="no">${s.no}</span><b>${s.nama}</b></span></td>
      ${cells}
      <td><b>${s.lunasCount}</b>/12</td>
      <td>${pill}</td>
    </tr>`;
  }).join('');

  observeAll();
}

function renderTableFoot(st) {
  $('#tfootRow').innerHTML =
    `<td class="sticky-l">Total (${state.siswa.length} siswa)</td>`
  + st.perBulanCount.map(c => `<td>${c}</td>`).join('')
  + `<td>${st.sel}</td><td>${ringkas(st.masuk)}</td>`;
}

const NAMA_BULAN_PENDEK = { juli:'JUL', agustus:'AGU', september:'SEP', oktober:'OKT',
  november:'NOV', desember:'DES', januari:'JAN', februari:'FEB', maret:'MAR',
  april:'APR', mei:'MEI', juni:'JUN' };

function renderSpend(st) {
  const list = $('#txList');
  if (!state.pengeluaran.length) {
    list.innerHTML = '<div class="card"><b>Belum ada pengeluaran tercatat.</b></div>';
  } else {
    list.innerHTML = state.pengeluaran.map((p, i) => `
      <div class="tx reveal" style="--d:${Math.min(i, 10) * 60}ms">
        <div class="tx__date">
          <span class="tx__d">${p.tanggal || '–'}</span>
          <span class="tx__m">${NAMA_BULAN_PENDEK[p.bulan.toLowerCase()] || p.bulan.slice(0, 3).toUpperCase()}</span>
        </div>
        <div class="tx__body">
          <div class="tx__title">${p.keterangan.replace(/</g, '&lt;')}</div>
          <div class="tx__meta">Baris ${p.row} di sheet REKAP KAS</div>
        </div>
        <div class="tx__amt">−${rupiah(p.jumlah)}</div>
      </div>`).join('');
  }
  $('#txTotal').textContent = rupiah(st.keluar);
  $('#txCount').textContent = `${state.pengeluaran.length} transaksi · sisa saldo ${rupiah(st.saldo)}`;

  const sel = $('#fBulan');
  if (!sel.options.length) {
    sel.innerHTML = state.bulan
      .map((b, i) => `<option value="${b.charAt(0) + b.slice(1).toLowerCase()}"${i === state.elapsed - 1 ? ' selected' : ''}>${b}</option>`)
      .join('');
  }
  observeAll();
}

function renderFooter() {
  $('#sourceInfo').innerHTML = state.source === 'live'
    ? `Dibaca langsung dari Google Spreadsheet, dimuat <b>${new Date().toLocaleString('id-ID')}</b>.`
    : `Menggunakan <b>data cadangan</b> (snapshot). Data live dari Google Sheet sedang tidak bisa diakses.`;
  $('#linkSheet').href = `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/edit`;
}

function renderAll() {
  const st = stats();
  renderSummary(st);
  renderChart(st);
  renderTableHead();
  renderTableBody();
  renderTableFoot(st);
  renderSpend(st);
  renderFooter();
  observeAll();
  return st;
}

/* Setelah menyimpan, cukup segarkan angka — jangan render ulang tabel,
   supaya posisi scroll dan fokus pengguna tidak melompat. */
function refreshNumbers() {
  const st = stats();
  const put = (id, v, raw) => {
    const el = $(id); el.dataset.count = v;
    el.textContent = raw ? String(v) : rupiah(v);
  };
  put('#heroSaldo', st.saldo); put('#heroIn', st.masuk); put('#heroOut', st.keluar);
  put('#kpiIn', st.masuk); put('#kpiOut', st.keluar); put('#kpiSaldo', st.saldo);
  put('#kpiFull', st.lunasPenuh, true);
  $('#kpiInFoot').textContent = `${st.sel} pembayaran × ${rupiah(CFG.IURAN_PER_BULAN)}`;
  $('#kpiOutFoot').textContent = `${state.pengeluaran.length} transaksi tercatat`;
  $('#progressLabel').textContent = `${Math.round(st.rate * 100)}% · ${st.sel} dari ${st.totalSel} bulan-siswa`;
  $('#progressFill').style.transform = `scaleX(${st.rate})`;
  renderTableFoot(st);
  renderChart(st);
  $('#txTotal').textContent = rupiah(st.keluar);
  $('#txCount').textContent = `${state.pengeluaran.length} transaksi · sisa saldo ${rupiah(st.saldo)}`;
}

/* =========================================================================
   5. LOGIN GOOGLE
   Whitelist di config hanya menyembunyikan tombol. Yang benar-benar menjaga
   data adalah izin Editor di spreadsheet — Google yang menolak, bukan kita.
   Lihat DECISIONS.md CP-03.
   ========================================================================= */

const SCOPES = 'openid email profile https://www.googleapis.com/auth/spreadsheets';
let tokenClient = null;

function setupReady() {
  return Boolean(CFG.OAUTH_CLIENT_ID && window.google?.accounts?.oauth2);
}

function showSetup() {
  $('#originHint').textContent = location.origin.startsWith('http') ? location.origin : 'http://localhost:8000';
  $('#setupModal').setAttribute('open', '');
}

function login() {
  if (!CFG.OAUTH_CLIENT_ID) return showSetup();
  if (!window.google?.accounts?.oauth2) {
    return toast('Skrip Google belum selesai dimuat. Coba lagi sebentar lagi.', 'err');
  }
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.OAUTH_CLIENT_ID,
      scope: SCOPES,
      callback: onToken,
      error_callback: e => toast('Login dibatalkan atau gagal: ' + (e?.type || 'unknown'), 'err'),
    });
  }
  tokenClient.requestAccessToken({ prompt: state.token ? '' : 'consent' });
}

async function onToken(resp) {
  if (resp.error || !resp.access_token) {
    return toast('Login gagal: ' + (resp.error || 'tidak ada token'), 'err');
  }
  state.token = resp.access_token;
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',
                          { headers: { Authorization: 'Bearer ' + state.token } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    state.user = await r.json();
  } catch (e) {
    state.token = null;
    return toast('Tidak bisa membaca identitas akun. Coba lagi.', 'err');
  }

  const email = (state.user.email || '').toLowerCase();
  const list  = (CFG.ADMIN_EMAILS || []).map(x => String(x).toLowerCase());
  if (list.length && !list.includes(email)) {
    state.token = null; state.user = null;
    return toast(`Akun ${email} tidak terdaftar sebagai bendahara.`, 'err', 6000);
  }

  document.body.classList.add('is-editor');
  $('#whoami').textContent = '✏️ ' + email;
  $('#whoami').title = email;
  $('#formLocked').hidden = true;
  $('#formSpend').hidden  = false;
  $('#editHint').hidden   = false;
  toast('Mode edit aktif. Klik sel bulan untuk mengubah status pembayaran.', 'ok', 6000);
}

function logout() {
  if (state.token && window.google?.accounts?.oauth2) {
    try { google.accounts.oauth2.revoke(state.token, () => {}); } catch (e) {}
  }
  state.token = null; state.user = null;
  document.body.classList.remove('is-editor');
  $('#whoami').textContent = '';
  $('#formLocked').hidden = false;
  $('#formSpend').hidden  = true;
  $('#editHint').hidden   = true;
  toast('Keluar dari mode edit.', 'info');
}

/* =========================================================================
   6. TULIS KE SPREADSHEET
   ========================================================================= */

async function writeRange(range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}`
            + `/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + state.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (res.ok) return res.json();

  // Pesan error yang bisa ditindaklanjuti, bukan sekadar kode angka.
  const body = await res.text().catch(() => '');
  if (res.status === 401) { state.token = null; throw new Error('Sesi login kedaluwarsa. Klik Mode Edit lagi.'); }
  if (res.status === 403) throw new Error('Akun ini tidak punya izin Editor di spreadsheet, atau Google Sheets API belum di-enable.');
  if (res.status === 404) throw new Error('Spreadsheet atau nama sheet tidak ditemukan. Cek SHEET_ID dan nama tab di config.js.');
  throw new Error(`Gagal menyimpan (HTTP ${res.status}). ${body.slice(0, 140)}`);
}

async function toggleCell(btn) {
  if (!document.body.classList.contains('is-editor')) return;
  if (btn.classList.contains('saving')) return;

  const no = Number(btn.dataset.siswa);
  const m  = Number(btn.dataset.bulan);
  const s  = state.siswa.find(x => x.no === no);
  if (!s) return;

  const next  = !s.bayar[m];
  const range = `'${CFG.SHEET_IURAN}'!${colLetter(FIRST_MONTH_IDX + m)}${s.row}`;

  // Optimistic: ubah tampilan dulu, kembalikan kalau gagal.
  btn.classList.add('saving');
  const prevText = btn.textContent, prevClass = btn.className;
  btn.textContent = next ? '✓' : '·';
  btn.className = `cellbtn saving ${next ? 'cell cell--paid' : 'cell cell--unpaid'}`;

  try {
    await writeRange(range, [[next ? 'v' : '']]);
    s.bayar[m] = next;
    btn.classList.remove('saving');
    btn.setAttribute('aria-label', `${s.nama}, ${state.bulan[m]}: ${next ? 'sudah dibayar' : 'belum dibayar'}`);
    // Perbarui kolom Lunas & Tunggakan pada baris ini saja.
    const tr = btn.closest('tr');
    s.lunasCount = s.bayar.filter(Boolean).length;
    s.tunggakan  = s.bayar.slice(0, state.elapsed).filter(b => !b).length * CFG.IURAN_PER_BULAN;
    if (tr) {
      const tds = tr.querySelectorAll('td');
      tds[tds.length - 2].innerHTML = `<b>${s.lunasCount}</b>/12`;
      tds[tds.length - 1].innerHTML = s.lunasCount === 12 ? '<span class="pill pill--ok">LUNAS</span>'
        : s.tunggakan === 0 ? '<span class="pill pill--ok">AMAN</span>'
        : `<span class="pill ${s.tunggakan > 2 * CFG.IURAN_PER_BULAN ? 'pill--bad' : 'pill--warn'}">${rupiah(s.tunggakan)}</span>`;
    }
    refreshNumbers();
    toast(`${s.nama} — ${state.bulan[m]} ${next ? 'ditandai LUNAS' : 'dibatalkan'}.`, 'ok', 2600);
  } catch (err) {
    btn.textContent = prevText;
    btn.className = prevClass;
    toast(err.message, 'err', 8000);
  }
}

async function addSpend(e) {
  e.preventDefault();
  const btn = $('#btnSaveSpend');
  const bulan = $('#fBulan').value;
  const tanggal = Number($('#fTanggal').value);
  const jumlah  = Number($('#fJumlah').value);
  const ket     = $('#fKet').value.trim();

  // Validasi di sisi klien — ini kenyamanan, bukan keamanan.
  if (!(tanggal >= 1 && tanggal <= 31)) return toast('Tanggal harus 1–31.', 'err');
  if (!(jumlah > 0))                    return toast('Nominal harus lebih dari 0.', 'err');
  if (!ket)                             return toast('Keterangan wajib diisi.', 'err');

  const st = stats();
  if (jumlah > st.saldo) {
    if (!confirm(`Nominal ${rupiah(jumlah)} melebihi saldo ${rupiah(st.saldo)}.\nTetap simpan?`)) return;
  }

  const row = state.nextKasRow;
  const kumulatif = st.keluar + jumlah;
  const net = st.masuk - kumulatif;

  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    // B..I: bulan, (C&D dikosongkan — lihat DECISIONS CP-01), tanggal, jumlah, ket, kumulatif, net
    await writeRange(`'${CFG.SHEET_KAS}'!B${row}:I${row}`,
                     [[bulan, '', '', tanggal, jumlah, ket, kumulatif, net]]);
    state.pengeluaran.push({ bulan, tanggal, jumlah, keterangan: ket, row });
    state.nextKasRow = row + 1;
    renderSpend(stats());
    refreshNumbers();
    e.target.reset();
    $('#fBulan').value = state.bulan[state.elapsed - 1].charAt(0)
                       + state.bulan[state.elapsed - 1].slice(1).toLowerCase();
    toast(`Pengeluaran ${rupiah(jumlah)} tersimpan.`, 'ok');
  } catch (err) {
    toast(err.message, 'err', 8000);
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Ke Spreadsheet';
  }
}

/* =========================================================================
   7. EVENT & BOOT
   ========================================================================= */

function bindEvents() {
  $('#btnLogin').addEventListener('click', login);
  $('#btnLogin2').addEventListener('click', login);
  $('#btnLogout').addEventListener('click', logout);
  $('#closeSetup').addEventListener('click', () => $('#setupModal').removeAttribute('open'));
  $('#setupModal').addEventListener('click', e => {
    if (e.target.id === 'setupModal') $('#setupModal').removeAttribute('open');
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') $('#setupModal').removeAttribute('open');
  });

  let t;
  $('#q').addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => { state.query = e.target.value; renderTableBody(); }, 160);
  });

  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    state.filter = c.dataset.filter;
    renderTableBody();
  }));

  // Delegasi: tabel di-render ulang terus, jadi listener dipasang di induknya.
  $('#tbodyIuran').addEventListener('click', e => {
    const btn = e.target.closest('.cellbtn');
    if (btn) toggleCell(btn);
  });

  $('#formSpend').addEventListener('submit', addSpend);
}

async function boot() {
  bindEvents();
  initScrollFX();
  observeAll();

  try {
    const data = await loadData();
    Object.assign(state, data);
    state.elapsed = monthsElapsed();
    renderAll();
    console.info(`[kas] sumber: ${state.source} · ${state.siswa.length} siswa · bulan berjalan ke-${state.elapsed}`);
  } catch (err) {
    console.error(err);
    $('#tbodyIuran').innerHTML =
      `<tr><td colspan="15" class="empty">Gagal memuat data: ${err.message}</td></tr>`;
    toast('Gagal memuat data: ' + err.message, 'err', 9000);
  }
}

document.readyState === 'loading'
  ? addEventListener('DOMContentLoaded', boot)
  : boot();

})();
