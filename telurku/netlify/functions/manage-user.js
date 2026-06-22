const roleToDb = {
  Owner: "owner",
  Admin: "admin",
  "Anak Kandang": "kandang",
  "Kepala Penerimaan": "penerimaan",
  "Kepala Gudang": "gudang",
};

const manageableBy = {
  owner: ["owner", "admin", "kandang", "penerimaan", "gudang"],
  admin: ["kandang", "penerimaan", "gudang"],
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Konfigurasi server belum lengkap." });

  const userToken = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  if (!userToken) return json(401, { error: "Sesi login tidak ditemukan." });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Data tidak valid." });
  }

  const adminFetch = async (path, options = {}) => {
    const response = await fetch(`${supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error || "Permintaan Supabase gagal.");
    return data;
  };

  const authFetch = async (path, options = {}) => {
    const response = await fetch(`${supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error || "Sesi login tidak valid.");
    return data;
  };

  try {
    const caller = await authFetch("/auth/v1/user");
    const profiles = await adminFetch(`/rest/v1/profiles?id=eq.${caller.id}&select=id,role,is_active`);
    const callerProfile = profiles?.[0];
    if (!callerProfile?.is_active) return json(403, { error: "Akun tidak aktif." });

    const targetRole = roleToDb[payload.role] || payload.role;
    if (targetRole === "owner" && !payload.id) {
      return json(403, { error: "Owner hanya boleh satu akun dan tidak bisa dibuat dari menu pengguna." });
    }
    if (!manageableBy[callerProfile.role]?.includes(targetRole)) {
      return json(403, { error: "Posisi ini tidak bisa dikelola oleh akun saat ini." });
    }

    const fullName = String(payload.name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const assignment = String(payload.assignment || "Belum ditentukan").trim();
    const password = String(payload.password || "").trim();
    const isActive = payload.status !== "Nonaktif";

    if (!fullName || !email || !targetRole) return json(400, { error: "Nama, email, dan posisi wajib diisi." });
    if (!payload.id && password.length < 6) return json(400, { error: "Password minimal 6 karakter." });

    let authUserId = payload.id || "";
    if (payload.id) {
      const updateBody = {
        email,
        user_metadata: { full_name: fullName, role: targetRole },
      };
      if (password) updateBody.password = password;
      await adminFetch(`/auth/v1/admin/users/${payload.id}`, { method: "PUT", body: JSON.stringify(updateBody) });
    } else {
      const created = await adminFetch("/auth/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role: targetRole },
        }),
      });
      authUserId = created.id;
    }

    await adminFetch("/rest/v1/profiles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: authUserId,
        auth_email: email,
        full_name: fullName,
        role: targetRole,
        assignment,
        is_active: isActive,
      }),
    });

    if (password) {
      await adminFetch("/rest/v1/profile_passwords?on_conflict=profile_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          profile_id: authUserId,
          password_text: password,
          updated_by: caller.id,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    if (targetRole === "kandang" && isActive && assignment.startsWith("Kandang ")) {
      await adminFetch(`/rest/v1/cages?name=eq.${encodeURIComponent(assignment)}`, {
        method: "PATCH",
        body: JSON.stringify({ keeper_id: authUserId, updated_at: new Date().toISOString() }),
      });
    }

    return json(200, { id: authUserId });
  } catch (error) {
    return json(400, { error: error.message || "Gagal menyimpan pengguna." });
  }
};
