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
  owner: [["dashboard", "⌂", "Ringkasan"], ["laporan", "▥", "Laporan"], ["kandang", "▦", "Kandang"], ["drivers", "◇", "Supir"], ["users", "♙", "Pengguna"], ["settings", "⚙", "Kontrol"]],
  kandang: [["setoran", "+", "Setor"], ["riwayat", "◷", "Riwayat"]],
  penerimaan: [["antrian", "✓", "Penerimaan"], ["riwayat", "◷", "Riwayat"]],
  gudang: [["grading", "◫", "Grading"], ["riwayat", "◷", "Riwayat"]],
  admin: [["dashboard", "⌂", "Dashboard"], ["laporan", "▥", "Laporan"], ["kandang", "▦", "Kandang"], ["drivers", "◇", "Supir"], ["users", "♙", "Pengguna"]],
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
const cageStatusToDb = { Aktif: "aktif", "Belum Bertelur": "belum_bertelur", Afkir: "afkir", Kosong: "kosong", Perawatan: "perawatan" };
const dbCageStatusToLabel = Object.fromEntries(Object.entries(cageStatusToDb).map(([key, value]) => [value, key]));

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
    driverRows: [
      { id: 1, name: "Budi Santoso", is_active: true },
      { id: 2, name: "Agus Salim", is_active: true },
      { id: 3, name: "Joko Susilo", is_active: true },
    ],
    drivers: ["Budi Santoso", "Agus Salim", "Joko Susilo"],
    settings: { correctionsEnabled: false },
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
let state = { role: "owner", page: "dashboard", selectedReport: null, selectedTrip: null, editReportId: null, editCageId: null, editUserId: null, editDriverId: null, showUserForm: false, showDriverForm: false };
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
function timeShort(value) { return value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""; }
function currentUser() {
  if (authState.profile) return { name: authState.profile.full_name, initials: initials(authState.profile.full_name) };
  return roleUsers[state.role];
}
function assignedCage(userName = currentUser().name) {
  const assignment = authState.profile?.assignment;
  if (state.role === "kandang" && assignment) {
    const assigned = db.cages.find(c => c.name === assignment);
    if (assigned) return assigned;
  }
  return db.cages.find(c => c.keeper === userName);
}
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
  const map = { received: ["done", "Selesai"], waiting: ["wait", "Menunggu"], cancelled: ["issue", "Dibatalkan"], issue: ["issue", "Selisih"], Aktif: ["done", "Aktif"], Nonaktif: ["wait", "Nonaktif"], Afkir: ["issue", "Afkir"], "Belum Bertelur": ["wait", "Belum bertelur"], Kosong: ["info", "Kosong"] };
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

async function loadOperationalData() {
  const [{ data: profiles }, { data: cages, error: cageError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, assignment, is_active"),
    supabase.from("cages").select("id, code, name, status, note, keeper_id").order("id", { ascending: true }),
  ]);
  if (cageError) throw cageError;

  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
  db.cages = (cages || []).map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    status: dbCageStatusToLabel[c.status] || "Aktif",
    note: c.note || "",
    keeperId: c.keeper_id || "",
    keeper: profileMap.get(c.keeper_id)?.full_name || "Belum ditentukan",
  }));

  const [{ data: deposits, error: depositError }, { data: trips }, { data: drivers }, { data: gradings }, { data: settings }] = await Promise.all([
    supabase.from("deposits").select("id, reference_no, report_date, reported_at, cage_id, trip_no, trip_id, reported_pieces, actual_pieces, net_weight_kg, reporter_id, status, note").eq("report_date", today).order("reported_at", { ascending: false }),
    supabase.from("pickup_trips").select("id, trip_date, trip_no, driver_id, receiver_id").eq("trip_date", today),
    supabase.from("drivers").select("id, name, is_active").order("name", { ascending: true }),
    supabase.from("daily_gradings").select("*").eq("grading_date", today).limit(1),
    supabase.from("app_settings").select("key, value").in("key", ["corrections_enabled"]),
  ]);
  if (depositError) throw depositError;

  const tripMap = new Map((trips || []).map(trip => [trip.id, trip]));
  const driverMap = new Map((drivers || []).map(driver => [driver.id, driver]));
  if (drivers?.length) {
    db.driverRows = drivers;
    db.drivers = drivers.filter(driver => driver.is_active).map(driver => driver.name);
  }

  db.reports = (deposits || []).map(row => {
    const trip = row.trip_id ? tripMap.get(row.trip_id) : null;
    return {
      uuid: row.id,
      id: row.reference_no,
      date: row.report_date,
      time: timeShort(row.reported_at),
      cageId: row.cage_id,
      trip: row.trip_no,
      reported: row.reported_pieces,
      actual: row.actual_pieces,
      weight: row.net_weight_kg == null ? null : Number(row.net_weight_kg),
      driver: trip?.driver_id ? driverMap.get(trip.driver_id)?.name || null : null,
      status: row.status,
      reporter: profileMap.get(row.reporter_id)?.full_name || "Petugas",
      receiver: trip?.receiver_id ? profileMap.get(trip.receiver_id)?.full_name || null : null,
      note: row.note || "",
    };
  });

  const grading = gradings?.[0];
  if (grading) {
    db.grading = {
      A: Number(grading.grade_a_kg || 0),
      B: Number(grading.grade_b_kg || 0),
      C: Number(grading.grade_c_kg || 0),
      D: Number(grading.grade_d_kg || 0),
      E: Number(grading.grade_e_kg || 0),
      note: grading.note || "",
      closed: !!grading.is_closed,
      author: profileMap.get(grading.author_id)?.full_name || "",
    };
  } else {
    db.grading = { A: 0, B: 0, C: 0, D: 0, E: 0, note: "", closed: false, author: "" };
  }
  const correctionSetting = (settings || []).find(item => item.key === "corrections_enabled");
  db.settings = { ...(db.settings || {}), correctionsEnabled: correctionSetting?.value?.enabled === true };
  saveData();
}

function titleForPage() {
  return { dashboard: "Ringkasan Operasional", setoran: "Setoran Telur", antrian: "Penerimaan Telur", grading: "Grading Gudang", laporan: "Laporan Produksi", kandang: "Master Kandang", drivers: "Supir", users: "Pengguna & Akses", settings: "Kontrol", riwayat: "Riwayat Transaksi" }[state.page];
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
        <div class="card card-pad"><div class="progress-list">${topCages.length ? topCages.map(r => `<div class="progress-row"><b>${cage(r.cageId)?.name || "Kandang"}</b><div class="bar"><i style="width:${Math.round(r.weight/topCages[0].weight*100)}%"></i></div><span>${fmt(r.weight,1)} kg</span></div>`).join("") : empty("Belum ada setoran diterima")}</div></div>
      </div>
      <div><div class="section-head"><div><h2>Berat per grade</h2><p>Acuan input Accurate hari ini</p></div></div>
        <div class="card card-pad"><div class="grade-grid">${["A","B","C","D","E"].map(g => `<div class="grade-box ${g === "E" ? "e" : ""}"><b>${g}</b><small>${gradeLabels[g]}</small><strong style="display:block;margin-top:8px">${fmt(db.grading[g],1)} kg</strong></div>`).join("")}</div><div class="hint" style="margin-top:14px">Total grading ${fmt(gradeTotal,1)} kg · Selisih terhadap timbang ${fmt(weight-gradeTotal,1)} kg</div></div>
      </div>
    </div>
    ${recentTable(db.reports.slice(0,6))}`;
}

function stat(label, value, sub, icon) { return `<div class="stat"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${sub}</small></div>`; }

function correctionsEnabled() {
  return db.settings?.correctionsEnabled === true;
}

function canCorrectReport(report) {
  if (!correctionsEnabled() || !report?.uuid || report.status === "cancelled") return false;
  if (state.role === "kandang") return report.status === "waiting" && report.reporter === currentUser().name;
  return ["owner", "admin", "penerimaan"].includes(state.role);
}

function reportActions(report) {
  if (!canCorrectReport(report)) return "";
  return `<button class="btn btn-outline" data-edit-report="${report.uuid}">Ubah</button> <button class="btn btn-outline" data-cancel-report="${report.uuid}">Batalkan</button>`;
}

function correctionForm() {
  const report = db.reports.find(r => r.uuid === state.editReportId);
  if (!report || !canCorrectReport(report)) return "";
  const isKeeper = state.role === "kandang";
  return `<div class="form-card" style="margin-bottom:20px"><div class="card card-pad"><div class="card-title">Ubah setoran ${escapeHtml(report.id)}</div><p class="card-sub">${escapeHtml(cage(report.cageId)?.name || "Kandang")} · perubahan akan tersimpan sebagai koreksi</p>
    <form id="correction-form" style="margin-top:20px">
      <div class="form-row">
        <div class="form-group"><label>Trip</label><select name="trip">${[1,2,3,4].map(n=>`<option value="${n}" ${report.trip===n?"selected":""}>Trip ${n}</option>`).join("")}</select></div>
        <div class="form-group"><label>Jumlah dilaporkan</label><input name="reported" type="number" min="1" value="${report.reported}" required /></div>
      </div>
      ${isKeeper ? "" : `<div class="form-row"><div class="form-group"><label>Jumlah aktual</label><input name="actual" type="number" min="0" value="${report.actual ?? ""}" /></div><div class="form-group"><label>Berat bersih (kg)</label><input name="weight" type="number" min="0.1" step="0.1" value="${report.weight ?? ""}" /></div></div><div class="form-row"><div class="form-group"><label>Supir</label><select name="driver"><option value="">Belum dipilih</option>${db.drivers.map(d=>`<option ${report.driver===d?"selected":""}>${escapeHtml(d)}</option>`).join("")}</select></div><div class="form-group"><label>Status</label><select name="status"><option value="waiting" ${report.status==="waiting"?"selected":""}>Menunggu</option><option value="received" ${report.status==="received"?"selected":""}>Selesai</option></select></div></div>`}
      <div class="form-group"><label>Catatan koreksi</label><textarea name="note" placeholder="Tuliskan alasan koreksi">${escapeHtml(report.note || "")}</textarea></div>
      <div class="form-row"><button type="button" class="btn btn-outline" id="cancel-correction">Batal</button><button class="btn btn-primary">Simpan koreksi</button></div>
    </form></div></div>`;
}

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
    ${correctionForm()}
    <div class="queue">${db.reports.filter(r=>r.reporter===currentUser().name).map(reportCard).join("") || empty("Belum ada setoran")}</div></div>`;
}

function reportCard(r) {
  const c = cage(r.cageId);
  return `<article class="queue-card"><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h3>${c.name} · Trip ${r.trip}</h3>${statusBadge(r.status)}</div><p>${r.id} · dilaporkan ${r.reporter} pukul ${r.time}</p><div class="queue-meta"><span><b>${fmt(r.reported)}</b> butir dilaporkan</span>${r.actual != null ? `<span><b>${fmt(r.actual)}</b> butir diterima</span>` : ""}${r.weight != null ? `<span><b>${fmt(r.weight,1)}</b> kg</span>` : ""}${r.driver ? `<span>Supir: <b>${r.driver}</b></span>` : ""}</div></div>${reportActions(r) ? `<div>${reportActions(r)}</div>` : ""}</article>`;
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
  const receivedPieces = sum(received,"actual");
  const gradeLabels = { A: "Bagus", B: "Putih", C: "Retak", D: "Hancur", E: "Afkir" };
  const gradeTotal = ["A","B","C","D","E"].reduce((a,g)=>a+Number(db.grading[g]||0),0);
  return `<div class="section-head"><div><h2>Laporan ${dateLong()}</h2><p>Rekap produksi, penerimaan, dan pertanggungjawaban petugas</p></div><button class="btn btn-outline" id="export-csv">⇩ Unduh CSV</button></div>
    <div class="grid cols-4">${stat("Telur dilaporkan", `${fmt(sum(db.reports,"reported"))} butir`, `${db.reports.length} setoran`, "◉")}${stat("Telur diterima", `${fmt(receivedPieces)} butir`, `${mismatch.length} memiliki selisih`, "✓")}${stat("Berat bersih", `${fmt(weight,1)} kg`, receivedPieces ? `Rata-rata ${fmt(weight*1000/receivedPieces,1)} g/butir` : "Belum ada penerimaan", "▣")}${stat("Total grading", `${fmt(gradeTotal,1)} kg`, `Selisih ${fmt(weight-gradeTotal,1)} kg`, "◫")}</div>
    <div class="section-head"><div><h2>Berat per grade</h2><p>Rekap kilogram hasil grading A sampai E</p></div></div>
    <div class="card card-pad"><div class="grade-grid report-grade-grid">${["A","B","C","D","E"].map(g=>`<div class="grade-box ${g==="E"?"e":""}"><b>${g}</b><small>${gradeLabels[g]}</small><strong style="display:block;margin-top:8px">${fmt(db.grading[g],1)} kg</strong></div>`).join("")}</div></div>
    ${recentTable(db.reports)}
    <div class="section-head"><div><h2>Kontrol per supir</h2><p>Jumlah trip dan selisih butir</p></div></div>
    <div class="card table-wrap"><table><thead><tr><th>Supir</th><th>Trip diproses</th><th>Dilaporkan</th><th>Diterima</th><th>Selisih</th></tr></thead><tbody>${db.drivers.map(d=>{const rows=received.filter(r=>r.driver===d);const diff=sum(rows,r=>r.actual-r.reported);return `<tr><td><b>${d}</b></td><td>${new Set(rows.map(r=>r.trip)).size}</td><td>${fmt(sum(rows,"reported"))} butir</td><td>${fmt(sum(rows,"actual"))} butir</td><td class="${diff<0?"negative":""}">${fmt(diff)} butir</td></tr>`}).join("")}</tbody></table></div>`;
}

function recentTable(rows) {
  const showActions = rows.some(r => canCorrectReport(r));
  return `${correctionForm()}<div class="section-head"><div><h2>Detail setoran</h2><p>Jejak lengkap per kandang dan petugas</p></div></div><div class="card table-wrap"><table><thead><tr><th>Kandang / Trip</th><th>Pelapor</th><th>Dilaporkan</th><th>Diterima</th><th>Berat</th><th>Supir</th><th>Status</th>${showActions ? "<th></th>" : ""}</tr></thead><tbody>${rows.map(r=>`<tr><td><b>${cage(r.cageId)?.name || "Kandang"}</b><br><small>${r.id} · Trip ${r.trip}</small></td><td>${r.reporter}</td><td>${fmt(r.reported)} butir</td><td>${r.actual==null?"–":`${fmt(r.actual)} butir`}</td><td>${r.weight==null?"–":`${fmt(r.weight,1)} kg`}</td><td>${r.driver||"–"}</td><td>${statusBadge(r.status)}</td>${showActions ? `<td>${reportActions(r)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

function cagesPage() {
  const editing = state.editCageId ? cage(state.editCageId) : null;
  const keepers = db.users.filter(u=>u.role==="Anak Kandang" && u.status==="Aktif");
  return `${editing ? `<div class="form-card" style="margin-bottom:20px"><div class="card card-pad"><div class="card-title">Ubah ${editing.code}</div><p class="card-sub">Perubahan akan tercatat atas nama ${currentUser().name}</p><form id="cage-form" style="margin-top:20px"><div class="form-group"><label>Nama kandang</label><input name="name" value="${escapeHtml(editing.name)}" required /></div><div class="form-row"><div class="form-group"><label>Status</label><select name="status">${["Aktif","Belum Bertelur","Afkir","Kosong","Perawatan"].map(s=>`<option ${editing.status===s?"selected":""}>${s}</option>`).join("")}</select></div><div class="form-group"><label>Anak kandang</label><select name="keeper">${keepers.map(u=>`<option ${editing.keeper===u.name?"selected":""}>${escapeHtml(u.name)}</option>`).join("")}</select></div></div><div class="form-group"><label>Catatan</label><textarea name="note">${escapeHtml(editing.note)}</textarea></div><div class="form-row"><button type="button" class="btn btn-outline" id="cancel-cage">Batal</button><button class="btn btn-primary">Simpan perubahan</button></div></form></div></div>` : ""}
  <div class="section-head"><div><h2>30 kandang</h2><p>Nama, status, catatan, dan penanggung jawab</p></div><span class="badge info">Owner & Admin</span></div><div class="card table-wrap"><table><thead><tr><th>Kandang</th><th>Nama</th><th>Status</th><th>Anak kandang</th><th>Catatan</th><th></th></tr></thead><tbody>${db.cages.map(c=>`<tr><td><b>${c.code}</b></td><td>${c.name}</td><td>${statusBadge(c.status)}</td><td>${c.keeper}</td><td>${c.note||"–"}</td><td><button class="btn btn-outline" data-edit-cage="${c.id}">Ubah</button></td></tr>`).join("")}</tbody></table></div>`;
}

function driversPage() {
  const rows = db.driverRows || [];
  const editing = rows.find(driver => Number(driver.id) === Number(state.editDriverId));
  const showForm = state.showDriverForm || editing;
  return `${showForm ? `<div class="form-card" style="margin-bottom:20px"><div class="card card-pad"><div class="card-title">${editing ? "Ubah supir" : "Tambah supir"}</div><p class="card-sub">Supir aktif akan muncul di pilihan penerimaan trip.</p><form id="driver-form" style="margin-top:20px"><div class="form-row"><div class="form-group"><label>Nama supir</label><input name="name" value="${escapeHtml(editing?.name || "")}" required /></div><div class="form-group"><label>Status</label><select name="status"><option value="active" ${editing?.is_active !== false ? "selected" : ""}>Aktif</option><option value="inactive" ${editing?.is_active === false ? "selected" : ""}>Nonaktif</option></select></div></div><div class="form-row"><button type="button" class="btn btn-outline" id="cancel-driver">Batal</button><button class="btn btn-primary">Simpan supir</button></div></form></div></div>` : ""}
  <div class="section-head"><div><h2>Daftar supir</h2><p>Kelola nama supir yang dipakai saat proses penerimaan trip</p></div><button class="btn btn-primary" id="add-driver">+ Tambah supir</button></div>
  <div class="card table-wrap"><table><thead><tr><th>Nama supir</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(driver=>`<tr><td><b>${escapeHtml(driver.name)}</b></td><td>${statusBadge(driver.is_active ? "Aktif" : "Nonaktif")}</td><td><button class="btn btn-outline" data-edit-driver="${driver.id}">Ubah</button> <button class="btn btn-outline" data-toggle-driver="${driver.id}">${driver.is_active ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>`).join("") || `<tr><td colspan="3">${empty("Belum ada supir")}</td></tr>`}</tbody></table></div>`;
}

function settingsPage() {
  const enabled = correctionsEnabled();
  return `<div class="section-head"><div><h2>Kontrol koreksi setoran</h2><p>Owner dapat membuka atau mengunci tombol ubah dan batalkan setoran.</p></div></div>
    <div class="card card-pad">
      <div class="card-title">${enabled ? "Koreksi sedang aktif" : "Koreksi sedang terkunci"}</div>
      <p class="card-sub">${enabled ? "Tombol Ubah dan Batalkan tampil sesuai hak akses masing-masing posisi." : "Tombol Ubah dan Batalkan disembunyikan dari semua posisi."}</p>
      <div class="hint" style="margin:18px 0">Saat aktif, Anak Kandang hanya bisa mengubah atau membatalkan setoran sendiri yang masih menunggu. Kepala Penerimaan, Admin, dan Owner bisa melakukan koreksi operasional.</div>
      <button class="btn ${enabled ? "btn-outline" : "btn-primary"}" id="toggle-corrections">${enabled ? "Kunci menu koreksi" : "Aktifkan menu koreksi"}</button>
    </div>`;
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
  const pages = { dashboard:dashboardPage,setoran:setoranPage,antrian:antrianPage,grading:gradingPage,laporan:laporanPage,kandang:cagesPage,drivers:driversPage,users:usersPage,settings:settingsPage,riwayat:historyPage };
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
  document.querySelector("#setoran-form")?.addEventListener("submit", async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    const values={cageId:Number(fd.get("cageId")),trip:Number(fd.get("trip")),reported:Number(fd.get("reported")),note:String(fd.get("note")||"").trim()};
    try {
      const reference = await saveDepositToSupabase(values);
      await loadOperationalData();
      audit(`membuat setoran ${reference} sebanyak ${fmt(values.reported)} butir`);
      render();
      toast("Setoran berhasil dikirim ke Supabase");
    } catch (error) {
      toast(error.message || "Gagal mengirim setoran");
    }
  });
  document.querySelectorAll("[data-receive-trip]").forEach(el=>el.onclick=()=>{state.selectedTrip=Number(el.dataset.receiveTrip);render();window.scrollTo(0,0)});
  document.querySelector("#back-queue")?.addEventListener("click",()=>{state.selectedTrip=null;render()});
  document.querySelector("#receive-trip-form")?.addEventListener("submit",async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const rows=db.reports.filter(r=>r.status==="waiting"&&r.trip===state.selectedTrip);const driver=fd.get("driver");
    for(const r of rows){const actual=Number(fd.get(`actual_${r.id}`));const note=String(fd.get(`note_${r.id}`)||"").trim();if(actual!==r.reported&&!note){toast(`Isi catatan selisih untuk ${cage(r.cageId).name}`);return;}}
    try {
      await receiveTripToSupabase(state.selectedTrip, driver, rows, fd);
      audit(`mengonfirmasi Trip ${state.selectedTrip} dengan supir ${driver} (${rows.length} kandang)`);
      state.selectedTrip=null;
      await loadOperationalData();
      render();
      toast("Seluruh setoran dalam trip berhasil diterima");
    } catch (error) {
      toast(error.message || "Gagal menyimpan penerimaan");
    }
  });
  const gradingForm=document.querySelector("#grading-form");
  gradingForm?.addEventListener("input",()=>{const fd=new FormData(gradingForm);const total=["A","B","C","D","E"].reduce((a,g)=>a+Number(fd.get(g)||0),0);const incoming=sum(db.reports.filter(r=>r.status==="received"),"weight");document.querySelector("#grade-total").textContent=`${fmt(total,1)} kg`;document.querySelector("#grade-diff").textContent=`${fmt(incoming-total,1)} kg`;document.querySelector("#grade-e").textContent=`${fmt(fd.get("E"),1)} kg`});
  gradingForm?.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const values={A:Number(fd.get("A")||0),B:Number(fd.get("B")||0),C:Number(fd.get("C")||0),D:Number(fd.get("D")||0),E:Number(fd.get("E")||0),note:String(fd.get("note")||""),closed:e.submitter?.value==="close"};try{await saveGradingToSupabase(values);await loadOperationalData();audit(values.closed?"menutup laporan grading harian":"menyimpan grading sementara");render();toast(values.closed?"Laporan harian berhasil ditutup":"Grading sementara tersimpan")}catch(error){toast(error.message||"Gagal menyimpan grading")}});
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
  document.querySelector("#cage-form")?.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const c=cage(state.editCageId);const values={name:String(fd.get("name")).trim(),status:String(fd.get("status")),keeper:String(fd.get("keeper")),note:String(fd.get("note")).trim()};try{await saveCageToSupabase(state.editCageId,values);await loadUsersFromSupabase();await loadOperationalData();audit(`memperbarui ${c.code}: ${values.name}`);state.editCageId=null;render();toast("Kandang dan assignment berhasil diperbarui")}catch(error){toast(error.message||"Gagal menyimpan kandang")}});
  document.querySelector("#add-driver")?.addEventListener("click",()=>{state.editDriverId=null;state.showDriverForm=true;render();window.scrollTo(0,0)});
  document.querySelectorAll("[data-edit-driver]").forEach(el=>el.onclick=()=>{state.editDriverId=Number(el.dataset.editDriver);state.showDriverForm=false;render();window.scrollTo(0,0)});
  document.querySelector("#cancel-driver")?.addEventListener("click",()=>{state.editDriverId=null;state.showDriverForm=false;render()});
  document.querySelectorAll("[data-toggle-driver]").forEach(el=>el.onclick=async()=>{const driver=(db.driverRows||[]).find(d=>Number(d.id)===Number(el.dataset.toggleDriver));if(!driver)return;try{await saveDriverToSupabase({id:driver.id,name:driver.name,isActive:!driver.is_active});await loadOperationalData();audit(`${driver.is_active?"menonaktifkan":"mengaktifkan"} supir ${driver.name}`);render();toast("Status supir diperbarui")}catch(error){toast(error.message||"Gagal memperbarui supir")}});
  document.querySelector("#driver-form")?.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const editing=(db.driverRows||[]).find(d=>Number(d.id)===Number(state.editDriverId));const values={id:editing?.id,name:String(fd.get("name")).trim(),isActive:fd.get("status")==="active"};if(!values.name){toast("Nama supir wajib diisi");return;}try{await saveDriverToSupabase(values);await loadOperationalData();audit(`${editing?"memperbarui":"menambahkan"} supir ${values.name}`);state.editDriverId=null;state.showDriverForm=false;render();toast("Supir tersimpan di Supabase")}catch(error){toast(error.message||"Gagal menyimpan supir")}});
  document.querySelector("#toggle-corrections")?.addEventListener("click",async()=>{if(state.role!=="owner"){toast("Hanya Owner yang bisa mengubah kontrol koreksi");return;}const next=!correctionsEnabled();try{await saveCorrectionSetting(next);await loadOperationalData();audit(next?"membuka menu koreksi setoran":"mengunci menu koreksi setoran");render();toast(next?"Menu koreksi aktif":"Menu koreksi terkunci")}catch(error){toast(error.message||"Gagal menyimpan kontrol koreksi")}});
  document.querySelectorAll("[data-edit-report]").forEach(el=>el.onclick=()=>{state.editReportId=el.dataset.editReport;render();window.scrollTo(0,0)});
  document.querySelectorAll("[data-cancel-report]").forEach(el=>el.onclick=async()=>{const report=db.reports.find(r=>r.uuid===el.dataset.cancelReport);if(!canCorrectReport(report)){toast("Koreksi sedang terkunci atau akses tidak sesuai");return;}try{await cancelReportInSupabase(report);await loadOperationalData();audit(`membatalkan setoran ${report.id}`);state.editReportId=null;render();toast("Setoran dibatalkan")}catch(error){toast(error.message||"Gagal membatalkan setoran")}});
  document.querySelector("#cancel-correction")?.addEventListener("click",()=>{state.editReportId=null;render()});
  document.querySelector("#correction-form")?.addEventListener("submit",async e=>{e.preventDefault();const report=db.reports.find(r=>r.uuid===state.editReportId);if(!canCorrectReport(report)){toast("Koreksi sedang terkunci atau akses tidak sesuai");return;}const fd=new FormData(e.currentTarget);const actualValue=fd.get("actual");const weightValue=fd.get("weight");const values={trip:Number(fd.get("trip")),reported:Number(fd.get("reported")),actual:actualValue==null||actualValue===""?null:Number(actualValue),weight:weightValue==null||weightValue===""?null:Number(weightValue),driver:String(fd.get("driver")||""),status:String(fd.get("status")||"waiting"),note:String(fd.get("note")||"").trim()};try{await saveReportCorrectionToSupabase(report,values);await loadOperationalData();audit(`mengoreksi setoran ${report.id}`);state.editReportId=null;render();toast("Koreksi setoran tersimpan")}catch(error){toast(error.message||"Gagal menyimpan koreksi")}});
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

async function saveDepositToSupabase(values) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Sesi login habis. Silakan masuk ulang.");
  const reference = `ST-${Date.now().toString(36).toUpperCase()}`;
  const { error } = await supabase.from("deposits").insert({
    reference_no: reference,
    report_date: today,
    cage_id: values.cageId,
    trip_no: values.trip,
    reported_pieces: values.reported,
    reporter_id: userId,
    note: values.note || "",
    status: "waiting",
  });
  if (error) throw error;
  return reference;
}

async function saveCorrectionSetting(enabled) {
  if (state.role !== "owner") throw new Error("Hanya Owner yang bisa mengubah kontrol koreksi.");
  const { error } = await supabase.from("app_settings").upsert({
    key: "corrections_enabled",
    value: { enabled },
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw error;
}

async function saveReportCorrectionToSupabase(report, values) {
  if (!canCorrectReport(report)) throw new Error("Akses koreksi tidak tersedia.");
  const isKeeper = state.role === "kandang";
  const update = {
    trip_no: values.trip,
    reported_pieces: values.reported,
    note: values.note,
    updated_at: new Date().toISOString(),
  };

  if (!isKeeper) {
    update.status = values.status;
    update.actual_pieces = values.status === "received" ? values.actual : null;
    update.net_weight_kg = values.status === "received" ? values.weight : null;
    update.trip_id = null;

    if (values.status === "received") {
      if (values.actual == null || values.weight == null) throw new Error("Jumlah aktual dan berat wajib diisi untuk status selesai.");
      if (!values.driver) throw new Error("Supir wajib dipilih untuk status selesai.");
      const driver = (db.driverRows || []).find(d => d.name === values.driver);
      if (!driver) throw new Error("Supir belum tersedia di Supabase.");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error("Sesi login habis. Silakan masuk ulang.");
      const { data: trip, error: tripError } = await supabase
        .from("pickup_trips")
        .upsert({
          trip_date: report.date || today,
          trip_no: values.trip,
          driver_id: driver.id,
          receiver_id: userId,
          status: "received",
          received_at: new Date().toISOString(),
        }, { onConflict: "trip_date,trip_no" })
        .select("id")
        .single();
      if (tripError) throw tripError;
      update.trip_id = trip.id;
    }
  }

  const { error } = await supabase.from("deposits").update(update).eq("id", report.uuid);
  if (error) throw error;
}

async function cancelReportInSupabase(report) {
  if (!canCorrectReport(report)) throw new Error("Akses pembatalan tidak tersedia.");
  const { error } = await supabase
    .from("deposits")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", report.uuid);
  if (error) throw error;
}

async function receiveTripToSupabase(tripNo, driverName, rows, fd) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Sesi login habis. Silakan masuk ulang.");
  const driver = (db.driverRows || []).find(d => d.name === driverName);
  if (!driver) throw new Error("Supir belum tersedia di Supabase.");

  const { data: trip, error: tripError } = await supabase
    .from("pickup_trips")
    .upsert({
      trip_date: today,
      trip_no: tripNo,
      driver_id: driver.id,
      receiver_id: userId,
      status: "received",
      received_at: new Date().toISOString(),
    }, { onConflict: "trip_date,trip_no" })
    .select("id")
    .single();
  if (tripError) throw tripError;

  for (const r of rows) {
    const actual = Number(fd.get(`actual_${r.id}`));
    const note = String(fd.get(`note_${r.id}`) || "").trim();
    const { error } = await supabase
      .from("deposits")
      .update({
        actual_pieces: actual,
        net_weight_kg: Number(fd.get(`weight_${r.id}`)),
        trip_id: trip.id,
        status: "received",
        note: note || r.note || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.uuid);
    if (error) throw error;
  }
}

async function saveGradingToSupabase(values) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Sesi login habis. Silakan masuk ulang.");
  const { error } = await supabase.from("daily_gradings").upsert({
    grading_date: today,
    grade_a_kg: values.A,
    grade_b_kg: values.B,
    grade_c_kg: values.C,
    grade_d_kg: values.D,
    grade_e_kg: values.E,
    note: values.note,
    is_closed: values.closed,
    author_id: userId,
    closed_at: values.closed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "grading_date" });
  if (error) throw error;
}

async function saveCageToSupabase(cageId, values) {
  const keeper = db.users.find(u => u.name === values.keeper && u.role === "Anak Kandang");
  const keeperId = keeper?.id || null;
  const oldCage = cage(cageId);
  if (oldCage?.keeperId && oldCage.keeperId !== keeperId) {
    await supabase.from("profiles").update({ assignment: "Belum ditentukan" }).eq("id", oldCage.keeperId);
  }
  if (keeperId) {
    await supabase.from("cages").update({ keeper_id: null }).eq("keeper_id", keeperId);
  }
  const { error } = await supabase
    .from("cages")
    .update({
      name: values.name,
      status: cageStatusToDb[values.status] || "aktif",
      note: values.note,
      keeper_id: keeperId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cageId);
  if (error) throw error;
  if (keeperId) {
    const { error: profileError } = await supabase.from("profiles").update({ assignment: values.name }).eq("id", keeperId);
    if (profileError) throw profileError;
  }
}

async function saveDriverToSupabase(values) {
  if (!["owner", "admin"].includes(state.role)) throw new Error("Hanya Owner dan Admin yang bisa mengelola supir.");
  const payload = { name: values.name, is_active: values.isActive };
  const query = values.id
    ? supabase.from("drivers").update(payload).eq("id", values.id)
    : supabase.from("drivers").insert(payload);
  const { error } = await query;
  if (error) throw error;
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
    .select("id, auth_email, full_name, role, assignment, is_active")
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
  await loadOperationalData();
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
