import { SUPABASE_URL, supabase } from "./supabase-config.js";

const STORAGE_KEY = "telurku-mvp-v2";
const today = new Date().toISOString().slice(0, 10);

const roleLabels = {
  owner: "Owner",
  kandang: "Anak Kandang",
  penerimaan: "Kepala Penerimaan",
  gudang: "Kepala Gudang",
  admin: "Admin",
};

const navByRole = {
  owner: [["dashboard", "⌂", "Ringkasan"], ["laporan", "▥", "Laporan"], ["kandang", "▦", "Kandang"], ["users", "♙", "Pengguna"]],
  kandang: [["setoran", "+", "Setor"], ["riwayat", "◷", "Riwayat"]],
  penerimaan: [["antrian", "✓", "Penerimaan"], ["riwayat", "◷", "Riwayat"]],
  gudang: [["grading", "◫", "Grading"], ["riwayat", "◷", "Riwayat"]],
  admin: [["dashboard", "⌂", "Dashboard"], ["laporan", "▥", "Laporan"], ["kandang", "▦", "Kandang"], ["users", "♙", "Pengguna"]],
};

const roleUsers = {
  owner: { name: "Bapak Antoni", initials: "BA" },
  kandang: { name: "Andi Pratama", initials: "AP" },
  penerimaan: { name: "Rudi Hartono", initials: "RH" },
  gudang: { name: "Siti Aminah", initials: "SA" },
  admin: { name: "Maya Putri", initials: "MP" },
};

const subordinateRolesByActor = {
  owner: ["Owner", "Admin", "Anak Kandang", "Kepala Penerimaan", "Kepala Gudang"],
  admin: ["Anak Kandang", "Kepala Penerimaan", "Kepala Gudang"],
};

const creatableRolesByActor = {
  owner: ["Admin", "Anak Kandang", "Kepala Penerimaan", "Kepala Gudang"],
  admin: ["Anak Kandang", "Kepala Penerimaan", "Kepala Gudang"],
};

const dbRoleToLabel = {
  owner: "Owner",
  admin: "Admin",
  kandang: "Anak Kandang",
  penerimaan: "Kepala Penerimaan",
  gudang: "Kepala Gudang",
};

const labelToDbRole = Object.fromEntries(Object.entries(dbRoleToLabel).map(([key, value]) => [value, key]));
const INTERNAL_EMAIL_DOMAIN = "telurku.local";

function seedData() {
  const statuses = ["Aktif", "Aktif", "Aktif", "Belum Bertelur", "Aktif", "Aktif", "Afkir", "Aktif"];
  const cages = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    code: `K${String(i + 1).padStart(2, "0")}`,
    name: `Kandang ${i + 1}`,
    status: statuses[i] || "Aktif",
    note: i === 3 ? "Ayam usia 15 minggu" : i === 6 ? "Pengosongan bertahap" : "",
    keeper: i === 0 ? "Andi Pratama" : i === 1 ? "Dedi Setiawan" : i === 2 ? "Wawan Kurnia" : "Belum ditentukan",
  }));

  const reports = [
    [1, 1, 1260, 1258, 77.4, "Budi Santoso", "received"],
    [2, 1, 1190, 1190, 72.8, "Budi Santoso", "received"],
    [3, 1, 1350, 1342, 82.6, "Agus Salim", "received"],
    [5, 1, 980, 980, 60.2, "Agus Salim", "received"],
    [6, 1, 1110, null, null, null, "waiting"],
    [8, 1, 1280, null, null, null, "waiting"],
    [9, 1, 1040, 1040, 64.1, "Budi Santoso", "received"],
    [10, 1, 1220, 1217, 74.9, "Joko Susilo", "received"],
    [1, 2, 430, null, null, null, "waiting"],
  ].map((r, i) => ({
    id: `ST-${String(i + 1).padStart(3, "0")}`,
    date: today,
    time: `${String(7 + Math.floor(i / 4)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
    cageId: r[0], trip: r[1], reported: r[2], actual: r[3], weight: r[4], driver: r[5], status: r[6],
    reporter: r[0] < 11 ? "Andi Pratama" : "Dedi Setiawan",
    receiver: r[3] ? "Rudi Hartono" : null,
    note: r[3] != null && r[2] !== r[3] ? "Selisih ditemukan saat serah terima" : "",
  }));

  return {
    cages,
    reports,
    grading: { A: 210.5, B: 128.4, C: 38.2, D: 19.6, E: 4.3, note: "Afkir ditimbang dari ember merah", closed: false, author: "Siti Aminah" },
    drivers: ["Budi Santoso", "Agus Salim", "Joko Susilo"],
    users: [
      ["Bapak Antoni", "Owner", "Semua akses", "Aktif", "Owner#2026"],
      ["Andi Pratama", "Anak Kandang", "Kandang 1", "Aktif", "Kandang01"],
      ["Dedi Setiawan", "Anak Kandang", "Kandang 2", "Aktif", "Kandang02"],
      ["Wawan Kurnia", "Anak Kandang", "Kandang 3", "Aktif", "Kandang03"],
      ["Rudi Hartono", "Kepala Penerimaan", "Penerimaan", "Aktif", "Terima#2026"],
      ["Siti Aminah", "Kepala Gudang", "Gudang", "Aktif", "Gudang#2026"],
      ["Maya Putri", "Admin", "Laporan", "Aktif", "Admin#2026"],
    ].map((u, i) => ({ id: i + 1, name: u[0], role: u[1], assignment: u[2], status: u[3], password: u[4] })),
    audit: [],
  };
}

let db = loadData();
let state = { role: "owner", page: "dashboard", selectedReport: null, selectedTrip: null, editCageId: null, editUserId: null, showUserForm: false };
let authState = { loading: true, session: null, profile: null, error: "" };
window.telurkuSupabase = supabase;

function loadData() {
  try { return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedData()); }
  catch { return seedData(); }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function normalizeData(data) {
  data.users = (data.users || []).map(u => ({ ...u, password: u.password || defaultPasswordFor(u) }));
  return data;
}
function defaultPasswordFor(user) {
  return `${String(user.role || "User").split(" ")[0]}${String(user.id || "01").padStart(2, "0")}`;
}
function fmt(n, digits = 0) { return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(n || 0)); }
function dateLong(value = today) { return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function cage(id) { return db.cages.find(c => c.id === Number(id)); }
function initials(name = "") { return name.split(" ").filter(Boolean).map(x => x[0]).slice(0, 2).join("").toUpperCase() || "TK"; }
function currentUser() {
  if (authState.profile) return { name: authState.profile.full_name, initials: initials(authState.profile.full_name) };
  return roleUsers[state.role];
}
function assignedCage(userName = currentUser().name) { return db.cages.find(c => c.keeper === userName); }
function sum(list, key) { return list.reduce((a, item) => a + Number(typeof key === "function" ? key(item) : item[key] || 0), 0); }
function escapeHtml(v = "") { return String(v).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function loginToEmail(value = "") {
  const login = String(value).trim().toLowerCase().replace(/\s+/g, "");
  if (!login) return "";
  return login.includes("@") ? login : `${login}@${INTERNAL_EMAIL_DOMAIN}`;
}
function emailToLogin(value = "") {
  return String(value).endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)
    ? String(value).replace(`@${INTERNAL_EMAIL_DOMAIN}`, "")
    : String(value);
}
function statusBadge(status) {
  const map = { received: ["done", "Selesai"], waiting: ["wait", "Menunggu"], issue: ["issue", "Selisih"], Aktif: ["done", "Aktif"], Afkir: ["issue", "Afkir"], "Belum Bertelur": ["wait", "Belum bertelur"], Kosong: ["info", "Kosong"] };
  const item = map[status] || ["info", status];
  return `<span class="badge ${item[0]}"><i class="dot"></i>${item[1]}</span>`;
}
function toast(message) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}
function audit(action) { db.audit.unshift({ action, user: currentUser().name, at: new Date().toISOString() }); saveData(); }
function canManageUser(user) {
  return (subordinateRolesByActor[state.role] || []).includes(user.role);
}
function canSeePassword(user) {
  return canManageUser(user);
}
function passwordCell(user) {
  if (!canSeePassword(user)) return `<span class="badge wait">Dilindungi</span>`;
  return `<code class="password-pill">${escapeHtml(user.password || "")}</code>`;
}

function assignmentOptionsForRole(role) {
  if (role === "Anak Kandang") return db.cages.map(c => c.name);
  if (role === "Kepala Penerimaan") return ["Penerimaan"];
  if (role === "Kepala Gudang") return ["Gudang"];
  if (role === "Admin") return ["Laporan"];
  if (role === "Owner") return ["Semua akses"];
  return ["Belum ditentukan"];
}

function profileToUser(profile, passwordMap = new Map()) {
  return {
    id: profile.id,
    email: profile.auth_email || "",
    login: emailToLogin(profile.auth_email || ""),
    name: profile.full_name,
    role: dbRoleToLabel[profile.role] || profile.role,
    assignment: profile.assignment || "Belum ditentukan",
    status: profile.is_active ? "Aktif" : "Nonaktif",
    password: passwordMap.get(profile.id) || "",
  };
}

async function loadUsersFromSupabase() {
  if (!["owner", "admin"].includes(state.role)) return;
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, auth_email, full_name, role, assignment, is_active")
    .order("created_at", { ascending: true });
  if (error) {
    toast(`Gagal membaca pengguna: ${error.message || "cek migration profiles"}`);
    return;
  }

  const { data: passwords } = await supabase
    .from("profile_passwords")
    .select("profile_id, password_text");
  const passwordMap = new Map((passwords || []).map(row => [row.profile_id, row.password_text]));
  db.users = profiles.map(profile => profileToUser(profile, passwordMap));
}

function titleForPage() {
  return { dashboard: "Ringkasan Operasional", setoran: "Setoran Telur", antrian: "Penerimaan Telur", grading: "Grading Gudang", laporan: "Laporan Produksi", kandang: "Master Kandang", users: "Pengguna & Akses", riwayat: "Riwayat Transaksi" }[state.page];
}

function loginPage(message = "") {
  return `<main class="auth-screen">
    <section class="auth-card">
      <div class="brand auth-brand"><div class="brand-mark">T</div><div><strong>Telurku</strong><small>Operasional Farm</small></div></div>
      <h1>Masuk ke Telurku</h1>
      <p>Gunakan akun yang sudah dibuat di Supabase Authentication.</p>
      ${message ? `<div class="alert">${escapeHtml(message)}</div>` : ""}
      <form id="login-form">
        <div class="form-group"><label>Username / Email</label><input name="login" autocomplete="username" required /></div>
        <div class="form-group"><label>Password</label><input name="password" type="password" autocomplete="current-password" required /></div>
        <button class="btn btn-primary btn-block">Masuk</button>
      </form>
    </section>
  </main>`;
}

function loadingPage() {
  return `<main class="auth-screen"><section class="auth-card"><div class="empty"><div class="empty-icon">T</div>Menyiapkan sesi login...</div></section></main>`;
}

function shell(content) {
  const nav = navByRole[state.role];
  return `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">T</div><div><strong>Telurku</strong><small>Operasional Farm</small></div></div>
      <nav class="nav">${nav.map(n => `<button data-nav="${n[0]}" class="${state.page === n[0] ? "active" : ""}"><span class="ico">${n[1]}</span>${n[2]}</button>`).join("")}</nav>
      <div class="side-foot"><small>Masuk sebagai</small><b>${currentUser().name} · ${roleLabels[state.role]}</b></div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="top-title"><h1>${titleForPage()}</h1><p>${dateLong()}</p></div>
        <div class="profile"><span class="badge info supabase-badge" title="${SUPABASE_URL}">${roleLabels[state.role]}</span><div class="avatar">${currentUser().initials}</div>
          <button class="btn btn-outline" id="logout-btn">Keluar</button>
        </div>
      </header>
      <div class="content">${content}</div>
    </main>
    <nav class="mobile-nav" style="--nav-count:${nav.length}">${nav.map(n => `<button data-nav="${n[0]}" class="${state.page === n[0] ? "active" : ""}"><b>${n[1]}</b>${n[2]}</button>`).join("")}</nav>
  </div>`;
}

function dashboardPage() {
  const received = db.reports.filter(r => r.status === "received");
  const reported = sum(db.reports, "reported"), actual = sum(received, "actual"), weight = sum(received, "weight");
  const mismatch = received.filter(r => r.reported !== r.actual);
  const gradeTotal = Object.keys(db.grading).filter(k => /^[A-E]$/.test(k)).reduce((a, k) => a + Number(db.grading[k]), 0);
  const active = db.cages.filter(c => c.status === "Aktif").length;
  const topCages = [...received].sort((a,b) => b.weight-a.weight).slice(0,5);
  const greeting = state.role === "admin" ? "Dashboard input Accurate" : `Selamat datang, ${currentUser().name}`;
  const gradeLabels = { A: "Bagus", B: "Putih", C: "Retak", D: "Hancur", E: "Afkir" };
  return `<section class="hero"><h2>${greeting}</h2><p>${state.role === "admin" ? "Berat per grade hari ini siap digunakan sebagai acuan pencatatan ke Accurate." : `Produksi hari ini berjalan normal. Ada ${db.reports.filter(r => r.status === "waiting").length} setoran yang masih menunggu penerimaan.`}</p><span class="date-pill">● Data diperbarui saat ini</span></section>
    <div class="grid cols-4">
      ${stat("Total diterima", `${fmt(weight,1)} kg`, `${fmt(actual)} butir`, "◉")}
      ${stat("Kandang aktif", `${active} / ${db.cages.length}`, `${db.cages.length-active} tidak aktif`, "▦")}
      ${stat("Setoran hari ini", `${db.reports.length} trip`, `${received.length} sudah ditimbang`, "↗")}
      ${stat("Perlu diperiksa", `${mismatch.length} setoran`, `${fmt(sum(mismatch, r => Math.abs(r.reported-r.actual)))} butir selisih`, "!")}
    </div>
    <div class="grid cols-2">
      <div><div class="section-head"><div><h2>Produksi tertinggi</h2><p>Berat bersih per setoran kandang</p></div></div>
        <div class="card card-pad"><div class="progress-list">${topCages.map((r,i) => `<div class="progress-row"><b>${cage(r.cageId).name}</b><div class="bar"><i style="width:${Math.round(r.weight/topCages[0].weight*100)}%"></i></div><span>${fmt(r.weight,1)} kg</span></div>`).join("")}</div></div>
      </div>
      <div><div class="section-head"><div><h2>Berat per grade</h2><p>Acuan input Accurate hari ini</p></div></div>
        <div class="card card-pad"><div class="grade-grid">${["A","B","C","D","E"].map(g => `<div class="grade-box ${g === "E" ? "e" : ""}"><b>${g}</b><small>${gradeLabels[g]}</small><strong style="display:block;margin-top:8px">${fmt(db.grading[g],1)} kg</strong></div>`).join("")}</div><div class="hint" style="margin-top:14px">Total grading ${fmt(gradeTotal,1)} kg · Selisih terhadap timbang ${fmt(weight-gradeTotal,1)} kg</div></div>
      </div>
    </div>
    ${recentTable(db.reports.slice(0,6))}`;
}

function stat(label, value, sub, icon) { return `<div class="stat"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${sub}</small></div>`; }

function setoranPage() {
  const assigned = assignedCage();
  if (!assigned) return `<div class="form-card"><div class="card">${empty("Belum ada kandang yang ditugaskan. Hubungi admin.")}</div></div>`;
  if (assigned.status !== "Aktif") return `<div class="form-card"><div class="card">${empty(`${assigned.name} berstatus ${assigned.status}. Input setoran dinonaktifkan.`)}</div></div>`;
  return `<div class="form-card"><div class="card card-pad">
    <div class="card-title">Catat setoran ${assigned.name}</div><p class="card-sub">Kandang sudah ditentukan oleh admin</p>
    <form id="setoran-form" style="margin-top:24px">
      <input type="hidden" name="cageId" value="${assigned.id}" />
      <div class="hint" style="margin-bottom:18px"><b>${assigned.code}</b> · ${assigned.name} · ${statusBadge(assigned.status)}</div>
      <div class="form-group"><label>Trip</label><select name="trip"><option value="1">Trip 1</option><option value="2">Trip 2</option><option value="3">Trip 3</option><option value="4">Trip 4</option></select></div>
      <div class="form-group"><label>Jumlah telur</label><div class="input-big"><input name="reported" type="number" min="1" inputmode="numeric" placeholder="0" required/><span>butir</span></div></div>
      <div class="form-group"><label>Catatan <small style="font-weight:400;color:var(--muted)">(opsional)</small></label><textarea name="note" placeholder="Contoh: ada telur retak saat pengumpulan"></textarea></div>
      <div class="hint">ⓘ Waktu dan nama pelapor tersimpan otomatis. Data masih dapat diperbaiki selama belum diterima.</div>
      <button class="btn btn-primary btn-block" style="margin-top:18px">Kirim Setoran</button>
    </form></div>
    <div class="section-head"><div><h2>Setoran saya hari ini</h2><p>${db.reports.filter(r=>r.reporter===currentUser().name).length} laporan</p></div></div>
    <div class="queue">${db.reports.filter(r=>r.reporter===currentUser().name).map(reportCard).join("") || empty("Belum ada setoran")}</div></div>`;
}

function reportCard(r) {
  const c = cage(r.cageId);
  return `<article class="queue-card"><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h3>${c.name} · Trip ${r.trip}</h3>${statusBadge(r.status)}</div><p>${r.id} · dilaporkan ${r.reporter} pukul ${r.time}</p><div class="queue-meta"><span><b>${fmt(r.reported)}</b> butir dilaporkan</span>${r.actual != null ? `<span><b>${fmt(r.actual)}</b> butir diterima</span>` : ""}${r.weight != null ? `<span><b>${fmt(r.weight,1)}</b> kg</span>` : ""}${r.driver ? `<span>Supir: <b>${r.driver}</b></span>` : ""}</div></div></article>`;
}

function antrianPage() {
  if (state.selectedTrip) return receiveTripForm(state.selectedTrip);
  const waiting = db.reports.filter(r => r.status === "waiting");
  const done = db.reports.filter(r => r.status === "received");
  const tripNos = [...new Set(waiting.map(r => r.trip))].sort((a,b)=>a-b);
  return `<section class="hero"><h2>${tripNos.length} trip menunggu</h2><p>Satu trip diproses sekaligus karena seluruh setoran datang bersama satu supir.</p><span class="date-pill">${waiting.length} kandang · ${fmt(sum(waiting,"reported"))} butir</span></section>
    <div class="section-head"><div><h2>Antrean per trip</h2><p>Pilih trip yang baru tiba di station timbang</p></div></div>
    <div class="queue">${tripNos.map(trip => { const rows=waiting.filter(r=>r.trip===trip); return `<article class="queue-card"><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h3>Trip ${trip}</h3>${statusBadge("waiting")}</div><p>${rows.length} kandang datang bersamaan</p><div class="queue-meta"><span><b>${fmt(sum(rows,"reported"))}</b> butir dilaporkan</span><span>${rows.map(r=>cage(r.cageId).name).join(", ")}</span></div></div><button class="btn btn-primary" data-receive-trip="${trip}">Proses Trip ${trip}</button></article>`; }).join("") || empty("Semua trip sudah diperiksa")}</div>
    <div class="section-head"><div><h2>Selesai hari ini</h2><p>${done.length} setoran</p></div></div>${recentTable(done)}`;
}

function receiveTripForm(trip) {
  const rows = db.reports.filter(r=>r.status==="waiting" && r.trip===Number(trip));
  if (!rows.length) { state.selectedTrip = null; return antrianPage(); }
  return `<button class="btn btn-outline" id="back-queue">← Kembali ke antrean</button>
    <div class="card card-pad" style="margin-top:16px"><div class="card-title">Penerimaan Trip ${trip}</div><p class="card-sub">${rows.length} kandang · ${fmt(sum(rows,"reported"))} butir dilaporkan</p>
      <form id="receive-trip-form" style="margin-top:22px"><div class="form-group"><label>Nama supir untuk Trip ${trip}</label><select name="driver" required><option value="">Pilih supir</option>${db.drivers.map(d=>`<option>${d}</option>`).join("")}</select></div>
        <div class="queue">${rows.map(r=>`<article class="queue-card" style="display:block"><div style="display:flex;justify-content:space-between;gap:10px"><div><h3>${cage(r.cageId).name}</h3><p>${r.id} · ${r.reporter} · ${r.time}</p></div><span class="number">${fmt(r.reported)} butir</span></div><div class="form-row" style="margin-top:16px"><div class="form-group"><label>Jumlah aktual (butir)</label><input name="actual_${r.id}" type="number" min="0" value="${r.reported}" required /></div><div class="form-group"><label>Berat bersih (kg)</label><input name="weight_${r.id}" type="number" step="0.1" min="0.1" placeholder="0,0" required /></div></div><div class="form-group" style="margin-bottom:0"><label>Catatan jika ada selisih</label><input name="note_${r.id}" placeholder="Opsional jika jumlah sesuai" /></div></article>`).join("")}</div>
        <div class="hint" style="margin:18px 0">ⓘ Supir yang dipilih akan tercatat untuk seluruh kandang dalam Trip ${trip}.</div><button class="btn btn-primary btn-block">Konfirmasi seluruh Trip ${trip}</button></form></div>`;
}

function gradingPage() {
  const received = db.reports.filter(r=>r.status==="received");
  const inWeight = sum(received,"weight");
  const total = ["A","B","C","D","E"].reduce((a,g)=>a+Number(db.grading[g]||0),0);
  const labels = {A:"Bagus",B:"Putih",C:"Retak",D:"Hancur",E:"Afkir"};
  return `<section class="hero"><h2>Grading gabungan hari ini</h2><p>Semua telur telah digabung setelah penimbangan per kandang. Catat hasil akhir dalam kilogram.</p><span class="date-pill">${received.length} setoran · ${fmt(inWeight,1)} kg masuk</span></section>
    <div class="card card-pad"><form id="grading-form"><div class="grade-grid">${["A","B","C","D","E"].map(g=>`<div class="grade-box ${g==="E"?"e":""}"><b>${g}</b><small>${labels[g]}</small><input name="${g}" type="number" min="0" step="0.1" value="${db.grading[g]}" aria-label="Grade ${g}"/></div>`).join("")}</div>
      <div class="reconcile"><div><small>Berat masuk</small><strong>${fmt(inWeight,1)} kg</strong></div><div><small>Total grading</small><strong id="grade-total">${fmt(total,1)} kg</strong></div><div><small>Selisih</small><strong id="grade-diff">${fmt(inWeight-total,1)} kg</strong></div><div><small>Afkir (E)</small><strong id="grade-e">${fmt(db.grading.E,1)} kg</strong></div></div>
      <div class="form-group" style="margin-top:18px"><label>Catatan gudang</label><textarea name="note" placeholder="Catatan penyebab selisih atau afkir">${escapeHtml(db.grading.note)}</textarea></div>
      <div class="form-row"><button type="submit" name="action" value="save" class="btn btn-light">Simpan sementara</button><button type="submit" name="action" value="close" class="btn btn-primary">Tutup laporan hari ini</button></div>
    </form></div>`;
}

function laporanPage() {
  const received = db.reports.filter(r=>r.status==="received");
  const mismatch = received.filter(r=>r.actual!==r.reported);
  const weight = sum(received,"weight");
  const gradeLabels = { A: "Bagus", B: "Putih", C: "Retak", D: "Hancur", E: "Afkir" };
  const gradeTotal = ["A","B","C","D","E"].reduce((a,g)=>a+Number(db.grading[g]||0),0);
  return `<div class="section-head"><div><h2>Laporan ${dateLong()}</h2><p>Rekap produksi, penerimaan, dan pertanggungjawaban petugas</p></div><button class="btn btn-outline" id="export-csv">⇩ Unduh CSV</button></div>
    <div class="grid cols-4">${stat("Telur dilaporkan", `${fmt(sum(db.reports,"reported"))} butir`, `${db.reports.length} setoran`, "◉")}${stat("Telur diterima", `${fmt(sum(received,"actual"))} butir`, `${mismatch.length} memiliki selisih`, "✓")}${stat("Berat bersih", `${fmt(weight,1)} kg`, `Rata-rata ${fmt(weight*1000/sum(received,"actual"),1)} g/butir`, "▣")}${stat("Total grading", `${fmt(gradeTotal,1)} kg`, `Selisih ${fmt(weight-gradeTotal,1)} kg`, "◫")}</div>
    <div class="section-head"><div><h2>Berat per grade</h2><p>Rekap kilogram hasil grading A sampai E</p></div></div>
    <div class="card card-pad"><div class="grade-grid report-grade-grid">${["A","B","C","D","E"].map(g=>`<div class="grade-box ${g==="E"?"e":""}"><b>${g}</b><small>${gradeLabels[g]}</small><strong style="display:block;margin-top:8px">${fmt(db.grading[g],1)} kg</strong></div>`).join("")}</div></div>
    ${recentTable(db.reports)}
    <div class="section-head"><div><h2>Kontrol per supir</h2><p>Jumlah trip dan selisih butir</p></div></div>
    <div class="card table-wrap"><table><thead><tr><th>Supir</th><th>Trip diproses</th><th>Dilaporkan</th><th>Diterima</th><th>Selisih</th></tr></thead><tbody>${db.drivers.map(d=>{const rows=received.filter(r=>r.driver===d);const diff=sum(rows,r=>r.actual-r.reported);return `<tr><td><b>${d}</b></td><td>${new Set(rows.map(r=>r.trip)).size}</td><td>${fmt(sum(rows,"reported"))} butir</td><td>${fmt(sum(rows,"actual"))} butir</td><td class="${diff<0?"negative":""}">${fmt(diff)} butir</td></tr>`}).join("")}</tbody></table></div>`;
}

function recentTable(rows) {
  return `<div class="section-head"><div><h2>Detail setoran</h2><p>Jejak lengkap per kandang dan petugas</p></div></div><div class="card table-wrap"><table><thead><tr><th>Kandang / Trip</th><th>Pelapor</th><th>Dilaporkan</th><th>Diterima</th><th>Berat</th><th>Supir</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${cage(r.cageId).name}</b><br><small>${r.id} · Trip ${r.trip}</small></td><td>${r.reporter}</td><td>${fmt(r.reported)} butir</td><td>${r.actual==null?"–":`${fmt(r.actual)} butir`}</td><td>${r.weight==null?"–":`${fmt(r.weight,1)} kg`}</td><td>${r.driver||"–"}</td><td>${statusBadge(r.status)}</td></tr>`).join("")}</tbody></table></div>`;
}

function cagesPage() {
  const editing = state.editCageId ? cage(state.editCageId) : null;
  const keepers = db.users.filter(u=>u.role==="Anak Kandang" && u.status==="Aktif");
  return `${editing ? `<div class="form-card" style="margin-bottom:20px"><div class="card card-pad"><div class="card-title">Ubah ${editing.code}</div><p class="card-sub">Perubahan akan tercatat atas nama ${currentUser().name}</p><form id="cage-form" style="margin-top:20px"><div class="form-group"><label>Nama kandang</label><input name="name" value="${escapeHtml(editing.name)}" required /></div><div class="form-row"><div class="form-group"><label>Status</label><select name="status">${["Aktif","Belum Bertelur","Afkir","Kosong","Perawatan"].map(s=>`<option ${editing.status===s?"selected":""}>${s}</option>`).join("")}</select></div><div class="form-group"><label>Anak kandang</label><select name="keeper">${keepers.map(u=>`<option ${editing.keeper===u.name?"selected":""}>${escapeHtml(u.name)}</option>`).join("")}</select></div></div><div class="form-group"><label>Catatan</label><textarea name="note">${escapeHtml(editing.note)}</textarea></div><div class="form-row"><button type="button" class="btn btn-outline" id="cancel-cage">Batal</button><button class="btn btn-primary">Simpan perubahan</button></div></form></div></div>` : ""}
  <div class="section-head"><div><h2>30 kandang</h2><p>Nama, status, catatan, dan penanggung jawab</p></div><span class="badge info">Owner & Admin</span></div><div class="card table-wrap"><table><thead><tr><th>Kandang</th><th>Nama</th><th>Status</th><th>Anak kandang</th><th>Catatan</th><th></th></tr></thead><tbody>${db.cages.map(c=>`<tr><td><b>${c.code}</b></td><td>${c.name}</td><td>${statusBadge(c.status)}</td><td>${c.keeper}</td><td>${c.note||"–"}</td><td><button class="btn btn-outline" data-edit-cage="${c.id}">Ubah</button></td></tr>`).join("")}</tbody></table></div>`;
}

function usersPage() {
  const editing = db.users.find(u=>u.id===state.editUserId);
  const showForm = state.showUserForm || editing;
  const allowedRoles = editing?.role === "Owner" ? ["Owner"] : (creatableRolesByActor[state.role] || []);
  const selectedRole = editing?.role || allowedRoles[0] || "";
  const assignments = assignmentOptionsForRole(selectedRole);
  const canEditCurrent = !editing || canManageUser(editing);
  const assignmentField = `<div class="form-group" id="assignment-group" style="${selectedRole==="Anak Kandang"?"":"display:none"}"><label>Penugasan kandang</label><select name="assignment">${assignments.map(a=>`<option ${editing?.assignment===a?"selected":""}>${escapeHtml(a)}</option>`).join("")}</select><div class="hint" style="margin-top:8px">Wajib pilih satu kandang untuk Anak Kandang.</div></div>`;
  return `${showForm && canEditCurrent ? `<div class="form-card" style="margin-bottom:20px"><div class="card card-pad"><div class="card-title">${editing?"Ubah pengguna":"Tambah pengguna"}</div><p class="card-sub">Pilih posisi terlebih dahulu, lalu lengkapi data pengguna.</p><form id="user-form" style="margin-top:20px"><div class="form-row"><div class="form-group"><label>Posisi</label><select name="role">${allowedRoles.map(r=>`<option ${editing?.role===r?"selected":""}>${r}</option>`).join("")}</select></div><div class="form-group"><label>Status</label><select name="status"><option ${editing?.status!=="Nonaktif"?"selected":""}>Aktif</option><option ${editing?.status==="Nonaktif"?"selected":""}>Nonaktif</option></select></div></div><div class="form-group"><label>Nama lengkap</label><input name="name" value="${escapeHtml(editing?.name||"")}" required /></div><div class="form-group"><label>Username / Email</label><input name="login" value="${escapeHtml(editing?.login||emailToLogin(editing?.email||""))}" required autocomplete="username" /></div><div class="form-group"><label>Password</label><input name="password" value="${escapeHtml(editing?.password||"")}" ${editing?"":"required"} autocomplete="new-password" /><div class="hint" style="margin-top:8px">${editing?"Isi password hanya jika ingin mengganti password.":"Password awal untuk akun login baru."}</div></div>${assignmentField}<div class="form-row"><button type="button" class="btn btn-outline" id="cancel-user">Batal</button><button class="btn btn-primary">Simpan pengguna</button></div></form></div></div>` : ""}
  <div class="section-head"><div><h2>Pengguna sistem</h2><p>Beberapa karyawan dapat memiliki posisi yang sama</p></div><button class="btn btn-primary" id="add-user">+ Tambah pengguna</button></div><div class="card table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Posisi</th><th>Penugasan</th><th>Password</th><th>Status</th><th></th></tr></thead><tbody>${db.users.map(u=>{const locked=!canManageUser(u);return `<tr><td><div class="name-cell"><span class="mini-avatar">${u.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><b>${u.name}</b></div></td><td>${escapeHtml(u.login||emailToLogin(u.email||""))}</td><td>${u.role}</td><td>${u.assignment}</td><td>${passwordCell(u)}</td><td>${statusBadge(u.status)}</td><td>${locked?`<span class="badge wait">Dilindungi</span>`:`<button class="btn btn-outline" data-edit-user="${u.id}">Ubah</button> <button class="btn btn-outline" data-toggle-user="${u.id}">${u.status==="Aktif"?"Nonaktifkan":"Aktifkan"}</button>`}</td></tr>`}).join("")}</tbody></table></div>
    <div class="section-head"><div><h2>Aktivitas terbaru</h2><p>Siapa melakukan apa dan kapan</p></div></div><div class="card">${db.audit.length?db.audit.slice(0,8).map(a=>`<div style="padding:14px 18px;border-bottom:1px solid var(--line)"><b>${a.user}</b> ${a.action}<br><small style="color:var(--muted)">${new Date(a.at).toLocaleString("id-ID")}</small></div>`).join(""):empty("Aktivitas baru akan muncul di sini")}</div>`;
}

function historyPage() {
  const rows = state.role === "kandang" ? db.reports.filter(r=>r.reporter===currentUser().name) : db.reports;
  return `${recentTable(rows)}<div class="hint" style="margin-top:16px">ⓘ Semua perubahan menyimpan nama petugas dan waktu secara otomatis.</div>`;
}
function empty(text) { return `<div class="empty"><div class="empty-icon">✓</div>${text}</div>`; }

function render() {
  if (authState.loading) {
    document.querySelector("#app").innerHTML = loadingPage();
    return;
  }
  if (!authState.session || !authState.profile) {
    document.querySelector("#app").innerHTML = loginPage(authState.error);
    bindAuthEvents();
    return;
  }
  const pages = { dashboard:dashboardPage,setoran:setoranPage,antrian:antrianPage,grading:gradingPage,laporan:laporanPage,kandang:cagesPage,users:usersPage,riwayat:historyPage };
  document.querySelector("#app").innerHTML = shell((pages[state.page]||dashboardPage)());
  bindEvents();
}

function bindAuthEvents() {
  document.querySelector("#login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    authState = { ...authState, loading: true, error: "" };
    render();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginToEmail(fd.get("login")),
      password: String(fd.get("password")),
    });
    if (error) {
      authState = { loading: false, session: null, profile: null, error: "Email atau password belum cocok." };
      render();
      return;
    }
    await loadAuthProfile();
    render();
  });
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{state.page=el.dataset.nav;state.selectedReport=null;state.selectedTrip=null;render();window.scrollTo(0,0)});
  document.querySelector("#logout-btn")?.addEventListener("click", async()=>{await supabase.auth.signOut();authState={ loading:false, session:null, profile:null, error:"" };render()});
  document.querySelector("#setoran-form")?.addEventListener("submit", e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const now=new Date();
    const item={id:`ST-${String(db.reports.length+1).padStart(3,"0")}`,date:today,time:now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}),cageId:Number(fd.get("cageId")),trip:Number(fd.get("trip")),reported:Number(fd.get("reported")),actual:null,weight:null,driver:null,status:"waiting",reporter:currentUser().name,receiver:null,note:fd.get("note")};
    db.reports.unshift(item);audit(`membuat setoran ${item.id} sebanyak ${fmt(item.reported)} butir`);render();toast("Setoran berhasil dikirim");
  });
  document.querySelectorAll("[data-receive-trip]").forEach(el=>el.onclick=()=>{state.selectedTrip=Number(el.dataset.receiveTrip);render();window.scrollTo(0,0)});
  document.querySelector("#back-queue")?.addEventListener("click",()=>{state.selectedTrip=null;render()});
  document.querySelector("#receive-trip-form")?.addEventListener("submit",e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const rows=db.reports.filter(r=>r.status==="waiting"&&r.trip===state.selectedTrip);const driver=fd.get("driver");
    for(const r of rows){const actual=Number(fd.get(`actual_${r.id}`));const note=String(fd.get(`note_${r.id}`)||"").trim();if(actual!==r.reported&&!note){toast(`Isi catatan selisih untuk ${cage(r.cageId).name}`);return;}}
    for(const r of rows){Object.assign(r,{actual:Number(fd.get(`actual_${r.id}`)),weight:Number(fd.get(`weight_${r.id}`)),driver,receiver:currentUser().name,note:String(fd.get(`note_${r.id}`)||"").trim(),status:"received"});}
    audit(`mengonfirmasi Trip ${state.selectedTrip} dengan supir ${driver} (${rows.length} kandang)`);state.selectedTrip=null;render();toast("Seluruh setoran dalam trip berhasil diterima");
  });
  const gradingForm=document.querySelector("#grading-form");
  gradingForm?.addEventListener("input",()=>{const fd=new FormData(gradingForm);const total=["A","B","C","D","E"].reduce((a,g)=>a+Number(fd.get(g)||0),0);const incoming=sum(db.reports.filter(r=>r.status==="received"),"weight");document.querySelector("#grade-total").textContent=`${fmt(total,1)} kg`;document.querySelector("#grade-diff").textContent=`${fmt(incoming-total,1)} kg`;document.querySelector("#grade-e").textContent=`${fmt(fd.get("E"),1)} kg`});
  gradingForm?.addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget);["A","B","C","D","E"].forEach(g=>db.grading[g]=Number(fd.get(g)||0));db.grading.note=fd.get("note");db.grading.closed=e.submitter?.value==="close";db.grading.author=currentUser().name;audit(db.grading.closed?"menutup laporan grading harian":"menyimpan grading sementara");render();toast(db.grading.closed?"Laporan harian berhasil ditutup":"Grading sementara tersimpan")});
  document.querySelector("#export-csv")?.addEventListener("click",exportCsv);
  document.querySelectorAll("[data-toggle-user]").forEach(el=>el.onclick=async()=>{const u=db.users.find(x=>x.id===el.dataset.toggleUser);if(!canManageUser(u)){toast("Akses pengguna ini dilindungi");return;}const nextStatus=u.status==="Aktif"?"Nonaktif":"Aktif";try{await saveUserToSupabase({...u,status:nextStatus,password:""});await loadUsersFromSupabase();audit(`${nextStatus==="Aktif"?"mengaktifkan":"menonaktifkan"} pengguna ${u.name}`);render();toast("Status pengguna diperbarui")}catch(error){toast(error.message||"Gagal memperbarui status pengguna")}});
  document.querySelector("#add-user")?.addEventListener("click",()=>{state.editUserId=null;state.showUserForm=true;render();window.scrollTo(0,0)});
  document.querySelectorAll("[data-edit-user]").forEach(el=>el.onclick=()=>{const u=db.users.find(x=>x.id===el.dataset.editUser);if(!canManageUser(u)){toast("Akses pengguna ini dilindungi");return;}state.editUserId=u.id;state.showUserForm=false;render();window.scrollTo(0,0)});
  document.querySelector("#cancel-user")?.addEventListener("click",()=>{state.editUserId=null;state.showUserForm=false;render()});
  const userRoleSelect=document.querySelector("#user-form select[name='role']");
  userRoleSelect?.addEventListener("change",()=>updateUserAssignmentOptions());
  updateUserAssignmentOptions();
  document.querySelector("#user-form")?.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const existing=db.users.find(u=>u.id===state.editUserId);if(existing&&!canManageUser(existing)){toast("Akses pengguna ini dilindungi");return;}const login=String(fd.get("login")).trim();const values={id:existing?.id,name:String(fd.get("name")).trim(),login,email:loginToEmail(login),role:fd.get("role"),assignment:String(fd.get("assignment")).trim(),status:fd.get("status"),password:String(fd.get("password")).trim()};const allowedForSubmit=existing?.role==="Owner"?["Owner"]:(creatableRolesByActor[state.role]||[]);if(!allowedForSubmit.includes(values.role)){toast("Posisi ini tidak bisa dikelola oleh akun saat ini");return;}if(!values.email){toast("Username / email wajib diisi");return;}if(!existing&&!values.password){toast("Password wajib diisi");return;}if(values.password&&values.password.length<6){toast("Password minimal 6 karakter");return;}if(values.role==="Anak Kandang"&&!values.assignment.startsWith("Kandang ")){toast("Pilih satu kandang untuk Anak Kandang");return;}try{await saveUserToSupabase(values);await loadUsersFromSupabase();audit(`${existing?"memperbarui":"menambahkan"} pengguna ${values.name}`);state.editUserId=null;state.showUserForm=false;render();toast("Data pengguna tersimpan di Supabase")}catch(error){toast(error.message||"Gagal menyimpan pengguna")}});
  document.querySelectorAll("[data-edit-cage]").forEach(el=>el.onclick=()=>{state.editCageId=Number(el.dataset.editCage);render();window.scrollTo(0,0)});
  document.querySelector("#cancel-cage")?.addEventListener("click",()=>{state.editCageId=null;render()});
  document.querySelector("#cage-form")?.addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const c=cage(state.editCageId);const oldKeeper=c.keeper;const newKeeper=fd.get("keeper");const newName=String(fd.get("name")).trim();if(newKeeper!==oldKeeper){const oldUser=db.users.find(u=>u.name===oldKeeper&&u.role==="Anak Kandang");if(oldUser)oldUser.assignment="Belum ditentukan";db.cages.filter(x=>x.id!==c.id&&x.keeper===newKeeper).forEach(x=>x.keeper="Belum ditentukan");}Object.assign(c,{name:newName,status:fd.get("status"),keeper:newKeeper,note:String(fd.get("note")).trim()});const assignedUser=db.users.find(u=>u.name===newKeeper&&u.role==="Anak Kandang");if(assignedUser)assignedUser.assignment=newName;audit(`memperbarui ${c.code}: ${c.name}`);state.editCageId=null;render();toast("Kandang dan assignment berhasil diperbarui")});
}

function updateUserAssignmentOptions() {
  const form=document.querySelector("#user-form");
  if(!form) return;
  const role=form.querySelector("select[name='role']")?.value || "";
  const group=form.querySelector("#assignment-group");
  const assignment=form.querySelector("select[name='assignment']");
  if(!assignment) return;
  if(group) group.style.display = role === "Anak Kandang" ? "" : "none";
  const current=assignment.value;
  const options=assignmentOptionsForRole(role);
  const next=options.includes(current) ? current : options[0] || "";
  assignment.innerHTML=options.map(a=>`<option ${a===next?"selected":""}>${escapeHtml(a)}</option>`).join("");
}

async function saveUserToSupabase(values) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi login habis. Silakan masuk ulang.");

  const response = await fetch("/.netlify/functions/manage-user", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Gagal menyimpan pengguna.");
  return result;
}

function syncUserCageAssignment(user, previousName) {
  db.cages.filter(c=>c.keeper===previousName||c.keeper===user.name).forEach(c=>c.keeper="Belum ditentukan");
  if(user.role!=="Anak Kandang"||user.status!=="Aktif") return;
  const target=db.cages.find(c=>c.name===user.assignment);
  if(!target) return;
  const displaced=db.users.find(u=>u.name===target.keeper&&u.role==="Anak Kandang");
  if(displaced) displaced.assignment="Belum ditentukan";
  target.keeper=user.name;
}

function exportCsv() {
  const header=["Tanggal","ID","Kandang","Trip","Pelapor","Butir Dilaporkan","Butir Diterima","Selisih","Berat Kg","Supir","Penerima","Status"];
  const lines=db.reports.map(r=>[r.date,r.id,cage(r.cageId).name,r.trip,r.reporter,r.reported,r.actual??"",r.actual==null?"":r.actual-r.reported,r.weight??"",r.driver??"",r.receiver??"",r.status]);
  const csv=[header,...lines].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download=`laporan-telur-${today}.csv`;a.click();URL.revokeObjectURL(a.href);toast("Laporan CSV dibuat");
}

async function loadAuthProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    authState = { loading: false, session: null, profile: null, error: "" };
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    authState = { loading: false, session, profile: null, error: "Akun sudah login, tetapi profil belum ditemukan di tabel profiles." };
    return;
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    authState = { loading: false, session: null, profile: null, error: "Akun ini sedang nonaktif." };
    return;
  }

  authState = { loading: false, session, profile, error: "" };
  state.role = profile.role;
  if (!navByRole[state.role]?.some(item => item[0] === state.page)) state.page = navByRole[state.role][0][0];
  await loadUsersFromSupabase();
}

async function init() {
  try {
    await loadAuthProfile();
  } catch (error) {
    authState = { loading: false, session: null, profile: null, error: `Gagal menyiapkan aplikasi: ${error.message || error}` };
  }
  supabase.auth.onAuthStateChange(async event => {
    if (event === "SIGNED_OUT") {
      authState = { loading: false, session: null, profile: null, error: "" };
      render();
      return;
    }
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      try {
        await loadAuthProfile();
      } catch (error) {
        authState = { loading: false, session: null, profile: null, error: `Gagal menyiapkan aplikasi: ${error.message || error}` };
      }
      render();
    }
  });
  render();
}

init();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
