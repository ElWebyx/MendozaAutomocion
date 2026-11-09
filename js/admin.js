/* ==========================================================================
   Mendoza Automoción · Panel de administración (Firebase)
   --------------------------------------------------------------------------
   Habla directamente con Firebase (sin librerías):
   - Acceso:  Firebase Authentication (correo y contraseña)
   - Datos:   Cloud Firestore → colecciones "vehiculos", "ajustes" y "fotos"
   - Fotos:   se guardan dentro de Firestore (plan gratis, sin tarjeta), en
              dos tamaños: "ID" (grande) e "ID_m" (miniatura).
   Los permisos los ponen las reglas de Firestore (firebase/firestore.rules):
   solo los correos de la lista pueden guardar cambios.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const num = (v) => { const d = String(v ?? "").replace(/\D/g, ""); return d ? Number(d) : null; };

  const fb = (window.SITE && window.SITE.firebase) || {};
  const KEY = fb.apiKey || "";
  const FS = window.MZ.fs;
  const AUTH = fb.authBase || "https://identitytoolkit.googleapis.com/v1";
  const TOKEN = fb.tokenBase || "https://securetoken.googleapis.com/v1";
  const SESSION_KEY = "mz-admin-session";
  const srcAttr = (ref, size) => window.MZ.srcAttr(ref, size);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------------------------------------------------------------- Aviso */
  let toastTimer;
  function toast(msg, bad = false) {
    const t = $("#toast");
    t.textContent = msg; t.classList.toggle("is-bad", bad); t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("is-on"); setTimeout(() => { t.hidden = true; }, 300); }, bad ? 6000 : 3200);
  }
  function confirmBox(title, text, yes = "Sí") {
    const d = $("#confirm");
    $("#confirm-title").textContent = title; $("#confirm-text").textContent = text; $("#confirm-yes").textContent = yes;
    d.returnValue = ""; d.showModal();
    return new Promise((res) => d.addEventListener("close", () => res(d.returnValue === "yes"), { once: true }));
  }
  $$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) d.close(); }));

  /* ------------------------------------------------------------- Firebase */
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { session = null; }
  const saveSession = (s) => { session = s; try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {} };

  const AUTH_ERRORS = {
    INVALID_LOGIN_CREDENTIALS: "Correo o contraseña incorrectos.", INVALID_PASSWORD: "Correo o contraseña incorrectos.",
    EMAIL_NOT_FOUND: "Correo o contraseña incorrectos.", INVALID_EMAIL: "El correo no es válido.",
    USER_DISABLED: "Este usuario está desactivado.", TOO_MANY_ATTEMPTS_TRY_LATER: "Demasiados intentos. Espera unos minutos.",
    WEAK_PASSWORD: "La contraseña es demasiado corta (mínimo 6).", CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "Por seguridad, sal y vuelve a entrar antes de cambiarla."
  };
  async function authCall(url, body, form = false) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" },
      body: form ? new URLSearchParams(body).toString() : JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const code = ((j.error && j.error.message) || "ERROR").split(" ")[0].split(":")[0];
      throw Object.assign(new Error(AUTH_ERRORS[code] || "Error de acceso (" + code + ")"), { status: r.status, code });
    }
    return j;
  }
  async function signIn(email, password) {
    const j = await authCall(`${AUTH}/accounts:signInWithPassword?key=${KEY}`, { email, password, returnSecureToken: true });
    return { idToken: j.idToken, refreshToken: j.refreshToken, expires_at: Date.now() / 1000 + Number(j.expiresIn || 3600), email: j.email };
  }
  async function refresh() {
    const j = await authCall(`${TOKEN}/token?key=${KEY}`, { grant_type: "refresh_token", refresh_token: session.refreshToken }, true);
    saveSession(Object.assign({}, session, { idToken: j.id_token, refreshToken: j.refresh_token, expires_at: Date.now() / 1000 + Number(j.expires_in || 3600) }));
  }
  async function token() {
    if (!session) throw Object.assign(new Error("Sesión cerrada"), { status: 401 });
    if (session.expires_at - 120 < Date.now() / 1000) { try { await refresh(); } catch (e) { return expired(); } }
    return session.idToken;
  }
  function expired() { saveSession(null); show("login"); toast("La sesión ha caducado. Vuelve a entrar.", true); throw new Error("Sesión caducada"); }

  /* Firestore con permisos de admin */
  async function fsReq(method, path, body, retry = true) {
    const url = `${FS.base}/${path}${path.includes("?") ? "&" : "?"}key=${KEY}`;
    const r = await fetch(url, { method, headers: { Authorization: "Bearer " + (await token()), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401 && retry) { try { await refresh(); } catch (e) { return expired(); } return fsReq(method, path, body, false); }
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const msg = r.status === 403 ? "No tienes permiso (revisa las reglas de Firestore y tu correo)." : (j.error && j.error.message) || "Error " + r.status;
      throw Object.assign(new Error(msg), { status: r.status });
    }
    return r.status === 204 ? null : r.json().catch(() => null);
  }
  const clean = (o) => { const c = Object.assign({}, o); delete c.id; return c; };
  // Guarda el documento entero (lo crea si no existe)
  const putDoc = (col, id, obj) => fsReq("PATCH", `${col}/${encodeURIComponent(id)}`, { fields: FS.toFields(clean(obj)) });
  // Cambia solo algunos campos
  const patchDoc = (col, id, obj) => fsReq("PATCH", `${col}/${encodeURIComponent(id)}?` + Object.keys(obj).map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&"), { fields: FS.toFields(obj) });
  const delDoc = (col, id) => fsReq("DELETE", `${col}/${encodeURIComponent(id)}`);
  const listDocs = async (col) => FS.fsList(col, await token());

  /* Fotos: se reducen en el navegador antes de subir (más rápido y ligero) */
  async function shrink(file, max, quality = 0.85) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("No se puede leer la foto (¿formato HEIC? Prueba con JPG).")); i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
    } finally { URL.revokeObjectURL(url); }
  }
  // La foto se guarda como texto dentro de la base de datos (máx. ~1 MB por documento)
  async function toDataURL(file, max, quality) {
    let blob = await shrink(file, max, quality);
    let q = quality;
    while (blob.size > 650000 && q > 0.45) { q -= 0.1; blob = await shrink(file, max, q); }
    return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  }
  async function upload(file, max = 1600) {
    const id = newId();
    const [big, small] = await Promise.all([toDataURL(file, max, 0.82), toDataURL(file, 640, 0.78)]);
    await Promise.all([
      putDoc("fotos", id, { data: big, creado: new Date().toISOString() }),
      putDoc("fotos", id + "_m", { data: small, creado: new Date().toISOString() })
    ]);
    window.MZ.photoCache.set(id, Promise.resolve(big)); window.MZ.photoCache.set(id + "_m", Promise.resolve(small));
    return "fs:" + id;
  }
  async function removeFiles(refs) {
    const ids = (refs || []).filter((r) => r && String(r).startsWith("fs:")).map((r) => r.slice(3));
    await Promise.all(ids.flatMap((id) => [delDoc("fotos", id), delDoc("fotos", id + "_m")]).map((p) => p.catch(() => {})));
  }

  /* ---------------------------------------------------------- Pantallas */
  function show(which) {
    $("#login").hidden = which !== "login";
    $("#setup").hidden = which !== "setup";
    $("#app").hidden = which !== "app";
  }

  /* --------------------------------------------------------------- Acceso */
  const loginForm = $("#login-form");
  $("#login-eye").addEventListener("click", (e) => {
    const p = $("#login-pass"); const on = p.type === "password";
    p.type = on ? "text" : "password"; e.currentTarget.textContent = on ? "Ocultar" : "Ver";
  });
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#login-msg"), btn = $("#login-btn");
    const email = $("#login-email").value.trim(), password = $("#login-pass").value;
    msg.hidden = true;
    if (!email || !password) { msg.textContent = "Escribe el correo y la contraseña."; msg.hidden = false; return; }
    btn.disabled = true; btn.textContent = "Entrando…";
    try {
      saveSession(await signIn(email, password));
      await enter();
    } catch (err) {
      saveSession(null);
      msg.textContent = err.message;
      msg.hidden = false;
    } finally { btn.disabled = false; btn.textContent = "Entrar"; }
  });

  async function enter() {
    // Este documento solo lo pueden leer los admins (si no existe, Firebase dice 404 = sí es admin)
    let ok = true;
    try { await fsReq("GET", "privado/acceso"); } catch (e) { if (e.status === 403) ok = false; else if (e.status !== 404) throw e; }
    if (!ok) {
      saveSession(null);
      throw new Error("Este correo no tiene permiso de administrador.");
    }
    const mail = session.email || "";
    $("#user-mail").textContent = mail; $("#user-av").textContent = (mail[0] || "A").toUpperCase();
    show("app");
    await loadAll();
  }

  const userBtn = $("#user-btn"), userMenu = $("#user-menu");
  userBtn.addEventListener("click", () => { const open = userMenu.hidden; userMenu.hidden = !open; userBtn.setAttribute("aria-expanded", String(open)); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".user")) { userMenu.hidden = true; userBtn.setAttribute("aria-expanded", "false"); } });
  $("#logout").addEventListener("click", async () => {
    saveSession(null); show("login"); $("#login-pass").value = "";
  });
  $("#pass-open").addEventListener("click", () => { userMenu.hidden = true; $("#pass-msg").hidden = true; $("#pass-new").value = ""; $("#pass-dialog").showModal(); });
  $("#pass-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = $("#pass-new").value, m = $("#pass-msg");
    if (p.length < 8) { m.textContent = "Mínimo 8 caracteres."; m.hidden = false; return; }
    try {
      const j = await authCall(`${AUTH}/accounts:update?key=${KEY}`, { idToken: await token(), password: p, returnSecureToken: true });
      saveSession(Object.assign({}, session, { idToken: j.idToken, refreshToken: j.refreshToken, expires_at: Date.now() / 1000 + Number(j.expiresIn || 3600) }));
      $("#pass-dialog").close(); toast("Contraseña cambiada.");
    }
    catch (err) { m.textContent = err.message; m.hidden = false; }
  });

  /* -------------------------------------------------------------- Pestañas */
  $$(".tabs__btn").forEach((b) => b.addEventListener("click", () => {
    $$(".tabs__btn").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    $$(".panel").forEach((p) => { p.hidden = p.id !== "tab-" + b.dataset.tab; });
    b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }));

  /* ============================================================ VEHÍCULOS */
  let rows = [];
  let settings = { negocio: {}, textos: {}, imagenes: {} };
  let pageDoc = null; // index.html leído para conocer los textos y fotos originales

  async function loadAll() {
    const [v, a] = await Promise.all([listDocs("vehiculos"), listDocs("ajustes")]);
    rows = v;
    a.forEach((x) => { settings[x.id] = clean(x); });
    $("#import-box").hidden = rows.length > 0;
    renderLists();
    fillBusiness();
    try {
      const html = await fetch("index.html", { cache: "no-store" }).then((r) => r.text());
      pageDoc = new DOMParser().parseFromString(html, "text/html");
    } catch (e) { pageDoc = null; }
    renderTexts();
    renderSitePhotos();
  }

  const titleOf = (r) => `${r.marca} ${r.modelo || ""}`.trim();
  const thumbOf = (r) => (r.fotos && r.fotos[0]) || "img/favicon.svg";
  const byOrder = (a, b) => (a.orden || 0) - (b.orden || 0) || String(b.creado_en || "").localeCompare(String(a.creado_en || ""));

  function rowHTML(r, sold) {
    const meta = [r.anio, r.km != null ? group(r.km) + " km" : null, r.cv ? r.cv + " CV" : null, r.combustible].filter(Boolean).join(" · ");
    const price = r.precio != null ? group(r.precio) + " €" : "Consultar";
    return `
      <li class="row" data-id="${r.id}">
        <img class="row__img" ${srcAttr(thumbOf(r), "m")} alt="" loading="lazy">
        <div class="row__main">
          <p class="row__title">${esc(titleOf(r))} ${r.tipo === "moto" ? '<span class="tag">Moto</span>' : ""}${r.destacado && !sold ? '<span class="tag tag--red">Destacado</span>' : ""}</p>
          <p class="row__meta">${esc(meta)}${!sold ? ` · ${(r.fotos || []).length} fotos` : ""}</p>
        </div>
        ${sold ? "" : `<p class="row__price">${price}</p>`}
        <div class="row__actions">
          ${sold ? "" : `<button type="button" class="icon-btn" data-act="up" aria-label="Subir">↑</button><button type="button" class="icon-btn" data-act="down" aria-label="Bajar">↓</button>`}
          <button type="button" class="btn btn--glass btn--sm" data-act="edit">Editar</button>
          ${sold ? `<button type="button" class="btn btn--ghost btn--sm" data-act="unsell">Volver al stock</button>`
                 : `<button type="button" class="btn btn--ghost btn--sm" data-act="sell">Vendido</button>`}
          <button type="button" class="icon-btn icon-btn--bad" data-act="del" aria-label="Borrar">🗑</button>
        </div>
      </li>`;
  }

  function renderLists() {
    const q1 = $("#stock-search").value.trim().toLowerCase();
    const q2 = $("#sold-search").value.trim().toLowerCase();
    const stock = rows.filter((r) => !r.vendido).sort(byOrder);
    const sold = rows.filter((r) => r.vendido).sort((a, b) => String(b.vendido_en || "").localeCompare(String(a.vendido_en || "")));
    const match = (q) => (r) => !q || titleOf(r).toLowerCase().includes(q);
    const s1 = stock.filter(match(q1)), s2 = sold.filter(match(q2));
    $("#stock-list").innerHTML = s1.length ? s1.map((r) => rowHTML(r, false)).join("") : `<li class="empty">${q1 ? "Nada con esa búsqueda." : "No hay vehículos en venta. Pulsa «Añadir vehículo»."}</li>`;
    $("#sold-list").innerHTML = s2.length ? s2.map((r) => rowHTML(r, true)).join("") : `<li class="empty">Nada por aquí.</li>`;
    const cars = stock.filter((r) => r.tipo === "coche").length;
    $("#stock-sub").textContent = `${stock.length} en venta (${cars} coches y ${stock.length - cars} motos). Lo que se ve en "Coches disponibles".`;
  }
  $("#stock-search").addEventListener("input", renderLists);
  $("#sold-search").addEventListener("input", renderLists);

  async function patch(id, data) {
    await patchDoc("vehiculos", id, data);
    const i = rows.findIndex((x) => x.id === id);
    if (i > -1) rows[i] = Object.assign({}, rows[i], data);
    return rows[i];
  }

  async function onRowAction(e) {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const id = btn.closest(".row").dataset.id;
    const r = rows.find((x) => x.id === id);
    const act = btn.dataset.act;
    try {
      if (act === "edit") return openEditor(r);
      if (act === "sell") {
        if (!(await confirmBox("Marcar como vendido", `${titleOf(r)} saldrá del stock y pasará a «Vendidos».`, "Marcar vendido"))) return;
        await patch(id, { vendido: true, vendido_en: new Date().toISOString(), destacado: false });
        if (settings.negocio && settings.negocio.soldTotal != null) {
          settings.negocio.soldTotal = Number(settings.negocio.soldTotal) + 1;
          await saveSetting("negocio", settings.negocio); fillBusiness();
        }
        toast("Marcado como vendido. Ya está en la web.");
      }
      if (act === "unsell") {
        await patch(id, { vendido: false, vendido_en: null });
        toast("Ha vuelto al stock.");
      }
      if (act === "del") {
        if (!(await confirmBox("Borrar vehículo", `Se borrará ${titleOf(r)} y sus fotos. No se puede deshacer.`, "Borrar"))) return;
        await delDoc("vehiculos", id);
        await removeFiles(r.fotos || []);
        rows = rows.filter((x) => x.id !== id);
        toast("Borrado.");
      }
      if (act === "up" || act === "down") {
        const stock = rows.filter((x) => !x.vendido).sort(byOrder);
        const i = stock.findIndex((x) => x.id === id), j = act === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= stock.length) return;
        [stock[i], stock[j]] = [stock[j], stock[i]];
        // Renumera solo lo necesario (de 10 en 10)
        const changes = stock.map((x, k) => ({ x, o: (k + 1) * 10 })).filter(({ x, o }) => x.orden !== o);
        changes.forEach(({ x, o }) => { x.orden = o; });
        renderLists();
        await Promise.all(changes.map(({ x, o }) => patchDoc("vehiculos", x.id, { orden: o })));
        return;
      }
      renderLists();
    } catch (err) { toast("No se pudo guardar: " + err.message, true); }
  }
  $("#stock-list").addEventListener("click", onRowAction);
  $("#sold-list").addEventListener("click", onRowAction);

  /* ------------------------------------------------- Editor de vehículo */
  const ed = $("#vehicle-editor"), edForm = $("#ve-form");
  let editing = null, photos = [], original = [], uploading = 0, soldMode = false;

  function openEditor(r, asSold = false) {
    editing = r || null;
    soldMode = r ? !!r.vendido : asSold;
    photos = r ? (r.fotos || []).slice() : [];
    original = photos.slice();
    $("#ve-title").textContent = r ? "Editar " + titleOf(r) : soldMode ? "Añadir vendido" : "Nuevo vehículo";
    edForm.reset();
    const f = edForm.elements;
    if (r) {
      f.tipo.value = r.tipo; f.marca.value = r.marca; f.modelo.value = r.modelo || "";
      f.anio.value = r.anio ?? ""; f.km.value = r.km != null ? group(r.km) : ""; f.cv.value = r.cv ?? "";
      f.combustible.value = r.combustible || "Gasolina"; f.cambio.value = r.cambio || "";
      f.precio.value = r.precio != null ? group(r.precio) : ""; f.garantia.value = r.garantia || "";
      f.destacado.checked = !!r.destacado; f.descripcion.value = r.descripcion || ""; f.equipamiento.value = r.equipamiento || "";
    } else { f.garantia.value = "12 meses"; f.anio.value = new Date().getFullYear() - 3; }
    $("#ve-msg").hidden = true;
    renderPhotos();
    ed.showModal();
  }
  $("#add-vehicle").addEventListener("click", () => openEditor(null));
  $("#add-sold").addEventListener("click", () => openEditor(null, true));

  function renderPhotos() {
    $("#ve-photos").innerHTML = photos.map((u, i) => `
      <li class="thumb" data-i="${i}">
        <img ${srcAttr(u, "m")} alt="Foto ${i + 1}">
        ${i === 0 ? '<span class="thumb__main">Principal</span>' : ""}
        <div class="thumb__bar">
          <button type="button" data-ph="left" aria-label="Mover a la izquierda" ${i === 0 ? "disabled" : ""}>←</button>
          <button type="button" data-ph="del" aria-label="Quitar foto">✕</button>
          <button type="button" data-ph="right" aria-label="Mover a la derecha" ${i === photos.length - 1 ? "disabled" : ""}>→</button>
        </div>
      </li>`).join("") + Array.from({ length: uploading }, () => `<li class="thumb thumb--loading"><span class="spinner"></span></li>`).join("");
  }
  $("#ve-photos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ph]"); if (!b) return;
    const i = Number(b.closest(".thumb").dataset.i);
    if (b.dataset.ph === "del") photos.splice(i, 1);
    if (b.dataset.ph === "left" && i > 0) [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]];
    if (b.dataset.ph === "right" && i < photos.length - 1) [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]];
    renderPhotos();
  });
  const fileInput = $("#ve-files");
  $("#ve-add-photos").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
  const drop = $("#ve-drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  async function addFiles(list) {
    const files = Array.from(list || []).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    if (!files.length) return;
    uploading += files.length; renderPhotos();
    for (const f of files) {
      try { photos.push(await upload(f, 1600)); }
      catch (err) { toast("Una foto no se pudo subir: " + err.message, true); }
      finally { uploading--; renderPhotos(); }
    }
  }

  edForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = edForm.elements, msg = $("#ve-msg"), btn = $("#ve-save");
    msg.hidden = true;
    if (!f.marca.value.trim()) { msg.textContent = "Escribe al menos la marca."; msg.hidden = false; f.marca.focus(); return; }
    if (uploading) { msg.textContent = "Espera a que terminen de subir las fotos."; msg.hidden = false; return; }
    const data = {
      tipo: f.tipo.value, marca: f.marca.value.trim(), modelo: f.modelo.value.trim(),
      anio: num(f.anio.value), km: num(f.km.value), cv: num(f.cv.value),
      combustible: f.combustible.value, cambio: f.cambio.value || null,
      precio: num(f.precio.value), garantia: f.garantia.value.trim() || null,
      destacado: f.destacado.checked, descripcion: f.descripcion.value.trim() || null,
      equipamiento: f.equipamiento.value.trim() || null, fotos: photos
    };
    btn.disabled = true; btn.textContent = "Guardando…";
    try {
      if (editing) {
        await patch(editing.id, data);
      } else {
        const stock = rows.filter((x) => !x.vendido);
        data.orden = data.destacado ? Math.min(0, ...stock.map((x) => x.orden)) - 10 : Math.max(0, ...stock.map((x) => x.orden)) + 10;
        if (soldMode) { data.vendido = true; data.vendido_en = new Date().toISOString(); }
        const r = Object.assign({ id: newId(), vendido: false, vendido_en: null, creado_en: new Date().toISOString() }, data);
        await putDoc("vehiculos", r.id, r);
        rows.push(r);
      }
      await removeFiles(original.filter((u) => !photos.includes(u)));
      ed.close(); renderLists();
      toast(editing ? "Cambios guardados. Ya están en la web." : "Vehículo añadido. Ya está en la web.");
    } catch (err) { msg.textContent = "No se pudo guardar: " + err.message; msg.hidden = false; }
    finally { btn.disabled = false; btn.textContent = "Guardar"; }
  });
  // Si se cierra sin guardar, se borran las fotos que se subieron en esa edición
  ed.addEventListener("close", () => {
    const orphan = photos.filter((u) => !original.includes(u));
    const saved = editing ? (rows.find((x) => x.id === editing.id) || {}).fotos || [] : rows.flatMap((x) => x.fotos || []);
    removeFiles(orphan.filter((u) => !saved.includes(u)));
  });

  /* Primera vez: copiar a Firebase el stock y los datos que ya tiene la web */
  $("#import-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!(await confirmBox("Importar datos actuales", "Se copiarán a la base de datos los vehículos en venta, los vendidos y los datos del negocio que tiene ahora la web.", "Importar"))) return;
    btn.disabled = true; btn.textContent = "Importando…";
    try {
      const now = Date.now();
      const docs = [];
      (window.VEHICLES || []).forEach((v, i) => docs.push({
        id: String(v.id), tipo: v.tipo, marca: v.marca, modelo: v.modelo, anio: v.anio, km: v.km, cv: v.cv ?? null,
        combustible: v.combustible, cambio: null, precio: v.precio ?? null, garantia: v.garantia || null,
        descripcion: null, equipamiento: null, destacado: !!v.destacado, vendido: false, vendido_en: null, orden: (i + 1) * 10,
        fotos: Array.from({ length: v.fotos || 1 }, (_, k) => `img/stock/${v.id}-${k}.jpg`), creado_en: new Date(now - i * 1000).toISOString()
      }));
      (window.SOLD || []).forEach((x, i) => {
        const marca = x.nombre.startsWith("Mercedes-AMG") ? "Mercedes-AMG" : x.nombre.split(" ")[0];
        docs.push({ id: String(x.id), tipo: "coche", marca, modelo: x.nombre.slice(marca.length).trim(), anio: x.anio, km: x.km, cv: null,
          combustible: null, cambio: null, precio: null, garantia: null, descripcion: null, equipamiento: null, destacado: false,
          vendido: true, vendido_en: new Date(now - i * 86400000).toISOString(), orden: 0, fotos: [`img/vendidos/${x.id}.jpg`], creado_en: new Date(now).toISOString() });
      });
      for (let i = 0; i < docs.length; i += 8) await Promise.all(docs.slice(i, i + 8).map((d) => putDoc("vehiculos", d.id, d)));
      const S = window.SITE;
      await putDoc("ajustes", "negocio", { phoneDisplay: S.phoneDisplay, whatsapp: "", email: S.email || "", address: S.address, addressShort: S.addressShort,
        schedule: S.schedule, social: S.social, soldTotal: window.SOLD_TOTAL || 0 });
      await putDoc("ajustes", "textos", {}); await putDoc("ajustes", "imagenes", {});
      await loadAll();
      toast(`Importados ${docs.length} vehículos. Ya puedes editarlo todo.`);
    } catch (err) { toast("No se pudo importar: " + err.message, true); }
    finally { btn.disabled = false; btn.textContent = "Importar datos actuales"; }
  });

  /* ============================================================== AJUSTES */
  async function saveSetting(clave, valor) {
    await putDoc("ajustes", clave, valor);
    settings[clave] = valor;
  }

  /* ----------------------------------------------- Datos del negocio */
  const DAYS = [[1, "Lunes"], [2, "Martes"], [3, "Miércoles"], [4, "Jueves"], [5, "Viernes"], [6, "Sábado"], [0, "Domingo"]];
  const bizForm = $("#biz-form");

  function fillBusiness() {
    const n = Object.assign({}, window.SITE, settings.negocio || {});
    const f = bizForm.elements;
    ["phoneDisplay", "email", "address", "addressShort"].forEach((k) => { f[k].value = n[k] || ""; });
    f.whatsapp.value = (settings.negocio && settings.negocio.whatsapp) || "";
    f.soldTotal.value = n.soldTotal ?? window.SOLD_TOTAL ?? "";
    f.instagram.value = (n.social && n.social.instagram) || "";
    f.facebook.value = (n.social && n.social.facebook) || "";
    const sch = n.schedule || {};
    $("#hours-editor").innerHTML = DAYS.map(([d, name]) => {
      const r = sch[d] || [];
      const t = (i, j) => (r[i] && r[i][j]) || "";
      return `
        <div class="day${r.length ? "" : " is-closed"}" data-day="${d}">
          <label class="day__name"><input type="checkbox" ${r.length ? "checked" : ""} data-open> <span>${name}</span></label>
          <div class="day__slots">
            <span class="slot"><input type="time" value="${t(0, 0)}" aria-label="${name}, mañana desde"> – <input type="time" value="${t(0, 1)}" aria-label="${name}, mañana hasta"></span>
            <span class="slot"><input type="time" value="${t(1, 0)}" aria-label="${name}, tarde desde"> – <input type="time" value="${t(1, 1)}" aria-label="${name}, tarde hasta"></span>
          </div>
          <span class="day__closed">Cerrado</span>
        </div>`;
    }).join("");
    hoursPreview();
  }
  function readSchedule() {
    const sch = {};
    $$(".day", bizForm).forEach((row) => {
      if (!$("[data-open]", row).checked) return;
      const v = $$("input[type=time]", row).map((i) => i.value);
      const slots = [[v[0], v[1]], [v[2], v[3]]].filter(([a, b]) => a && b);
      if (slots.length) sch[row.dataset.day] = slots;
    });
    return sch;
  }
  function hoursPreview() {
    $("#hours-preview").innerHTML = window.MZ.hoursFromSchedule(readSchedule()).map(([d, h]) => `<li><strong>${esc(d)}</strong> ${esc(h)}</li>`).join("");
  }
  $("#hours-editor").addEventListener("input", (e) => {
    const row = e.target.closest(".day");
    if (e.target.matches("[data-open]")) {
      row.classList.toggle("is-closed", !e.target.checked);
      if (e.target.checked && !$("input[type=time]", row).value) { const ins = $$("input[type=time]", row); ins[0].value = "10:00"; ins[1].value = "13:30"; }
    }
    hoursPreview();
  });
  bizForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = bizForm.elements;
    if (!f.phoneDisplay.value.replace(/\D/g, "")) { toast("Pon un teléfono.", true); f.phoneDisplay.focus(); return; }
    const valor = Object.assign({}, settings.negocio, {
      phoneDisplay: f.phoneDisplay.value.trim(), whatsapp: f.whatsapp.value.trim(), email: f.email.value.trim(),
      address: f.address.value.trim(), addressShort: f.addressShort.value.trim(),
      soldTotal: num(f.soldTotal.value) ?? 0,
      social: { instagram: f.instagram.value.trim(), facebook: f.facebook.value.trim() },
      schedule: readSchedule()
    });
    const btn = $("button[type=submit]", bizForm); btn.disabled = true;
    try { await saveSetting("negocio", valor); toast("Datos guardados. Ya están en la web."); }
    catch (err) { toast("No se pudo guardar: " + err.message, true); }
    finally { btn.disabled = false; }
  });

  /* --------------------------------------------------------------- Textos */
  const SECTION_NAMES = {
    inicio: "Portada (inicio)", coches: "Coches disponibles", vendidos: "Vendidos", servicios: "Servicios",
    proceso: "Cómo comprar (pasos)", vender: "Vende tu coche", encargo: "MD Auto Broker", nosotros: "Sobre nosotros",
    ubicacion: "Ubicación", cta: "Cierre final", pie: "Pie de página"
  };
  function labelFor(el) {
    if (el.closest("h1")) return "Título grande (línea)";
    if (el.matches(".kicker, .hero__place, .broker__tag")) return "Etiqueta pequeña";
    if (el.tagName === "H2") return "Título";
    if (el.tagName === "H3") return "Subtítulo";
    if (el.tagName === "STRONG") return "Título corto";
    if (el.tagName === "LI" || el.closest("li")) return "Punto de la lista";
    return "Texto";
  }
  function renderTexts() {
    const box = $("#texts-editor");
    if (!pageDoc) { box.innerHTML = `<p class="empty">No se pudo leer la página para sacar los textos.</p>`; return; }
    const saved = settings.textos || {};
    const groups = {};
    $$("[data-text]", pageDoc).forEach((el) => {
      const key = el.dataset.text, sec = key.replace(/-\d+$/, "");
      (groups[sec] = groups[sec] || []).push({ key, label: labelFor(el), def: window.MZ.toMarkup(el) });
    });
    box.innerHTML = Object.entries(groups).map(([sec, items]) => `
      <details class="tgroup"${sec === "inicio" ? " open" : ""}>
        <summary><span>${esc(SECTION_NAMES[sec] || sec)}</span><span class="muted small">${items.length} textos</span></summary>
        <div class="tgroup__body">
          ${items.map(({ key, label, def }) => {
            const val = typeof saved[key] === "string" && saved[key].trim() ? saved[key] : def;
            const long = def.length > 70;
            return `
              <label class="field tfield${val !== def ? " is-changed" : ""}" data-key="${key}">
                <span>${esc(label)} <button type="button" class="link" data-reset title="Volver al texto original">Original</button></span>
                ${long ? `<textarea rows="3" data-def="${esc(def)}">${esc(val)}</textarea>` : `<input type="text" value="${esc(val)}" data-def="${esc(def)}">`}
              </label>`;
          }).join("")}
        </div>
      </details>`).join("");
  }
  $("#texts-editor").addEventListener("input", (e) => {
    const f = e.target.closest(".tfield"); if (f) f.classList.toggle("is-changed", e.target.value !== e.target.dataset.def);
  });
  $("#texts-editor").addEventListener("click", (e) => {
    if (!e.target.matches("[data-reset]")) return;
    e.preventDefault();
    const f = e.target.closest(".tfield"), inp = $("input, textarea", f);
    inp.value = inp.dataset.def; f.classList.remove("is-changed");
  });
  $("#texts-save").addEventListener("click", async (e) => {
    const btn = e.currentTarget, valor = {};
    $$(".tfield", $("#texts-editor")).forEach((f) => {
      const inp = $("input, textarea", f), v = inp.value.trim();
      if (v && v !== inp.dataset.def) valor[f.dataset.key] = v;
    });
    btn.disabled = true;
    try { await saveSetting("textos", valor); toast("Textos guardados. Ya están en la web."); }
    catch (err) { toast("No se pudo guardar: " + err.message, true); }
    finally { btn.disabled = false; }
  });

  /* ------------------------------------------------------- Fotos de la web */
  const PHOTO_INFO = {
    hero: ["Foto de la portada", "Horizontal y grande (mínimo 1920 × 920). Es lo primero que se ve.", 2000],
    servicios: ["Servicios", "Cuadrada o casi cuadrada.", 1600],
    broker: ["MD Auto Broker", "Horizontal (4:3).", 1600],
    nosotros: ["Sobre nosotros", "Horizontal. Por ejemplo, la fachada o el equipo.", 1800],
    cierre: ["Fondo del cierre final", "Horizontal. Se ve oscurecida detrás del texto.", 2000]
  };
  function renderSitePhotos() {
    const list = $("#site-photos");
    const saved = settings.imagenes || {};
    const keys = pageDoc ? $$("[data-img]", pageDoc).map((i) => [i.dataset.img, i.getAttribute("src")]) : Object.keys(PHOTO_INFO).map((k) => [k, ""]);
    list.innerHTML = keys.map(([k, def]) => {
      const [name, hint] = PHOTO_INFO[k] || [k, ""];
      const cur = saved[k] || def;
      return `
        <li class="pcard" data-key="${k}" data-def="${esc(def)}">
          <div class="pcard__img"><img ${srcAttr(cur, "m")} alt="" onerror="this.parentNode.classList.add('is-empty')"><span class="pcard__empty">Sin foto</span></div>
          <div class="pcard__body">
            <h3>${esc(name)}</h3><p class="muted small">${esc(hint)}</p>
            <div class="pcard__actions">
              <button type="button" class="btn btn--red btn--sm" data-pc="change">Cambiar foto</button>
              ${saved[k] ? `<button type="button" class="btn btn--ghost btn--sm" data-pc="reset">Volver a la original</button>` : ""}
            </div>
          </div>
          <input type="file" accept="image/*" hidden>
        </li>`;
    }).join("");
  }
  $("#site-photos").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-pc]"); if (!b) return;
    const card = b.closest(".pcard"), key = card.dataset.key;
    if (b.dataset.pc === "change") return $("input[type=file]", card).click();
    if (!(await confirmBox("Volver a la foto original", "Se quitará la foto que subiste para esta sección.", "Volver"))) return;
    const old = (settings.imagenes || {})[key];
    const valor = Object.assign({}, settings.imagenes); delete valor[key];
    try { await saveSetting("imagenes", valor); await removeFiles([old]); renderSitePhotos(); toast("Hecho. Ya está en la web."); }
    catch (err) { toast("No se pudo guardar: " + err.message, true); }
  });
  $("#site-photos").addEventListener("change", async (e) => {
    const input = e.target; if (!input.files || !input.files[0]) return;
    const card = input.closest(".pcard"), key = card.dataset.key;
    card.classList.add("is-busy");
    try {
      const old = (settings.imagenes || {})[key];
      const url = await upload(input.files[0], (PHOTO_INFO[key] || [])[2] || 1920);
      await saveSetting("imagenes", Object.assign({}, settings.imagenes, { [key]: url }));
      if (old) await removeFiles([old]);
      renderSitePhotos(); toast("Foto cambiada. Ya está en la web.");
    } catch (err) { toast("No se pudo subir: " + err.message, true); card.classList.remove("is-busy"); }
  });

  /* ---------------------------------------------------------------- Inicio */
  (async function start() {
    if (!FS.configured) return show("setup");
    if (!session) return show("login");
    try { await enter(); }
    catch (err) { saveSession(null); show("login"); }
  })();
})();
