/* ==========================================================================
   Mendoza Automoción · Datos en vivo
   --------------------------------------------------------------------------
   Si en js/config.js están puestos los datos de Firebase, la web carga desde
   ahí el stock, los vendidos, los datos del negocio, los textos y las fotos
   que se cambian en el panel de administrador (admin.html).
   Si no hay conexión (o no está configurado) se usan los archivos locales
   js/config.js y js/vehicles.js, así la web nunca se queda vacía.
   ========================================================================== */

(function () {
  "use strict";

  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const DAY_PLURAL = ["Domingos", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados"];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Texto del panel → HTML: *cursiva roja*, **negrita**, saltos de línea y {vendidos} */
  function formatText(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\{vendidos\}/g, "<span data-sold-total></span>")
      .replace(/\n/g, "<br>");
  }

  /* HTML de la página → texto del panel (lo contrario de formatText) */
  function toMarkup(el) {
    const walk = (node) => {
      let out = "";
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) out += n.textContent.replace(/\s+/g, " ");
        else if (n.nodeType === 1 && !isDeco(n)) {
          if (n.hasAttribute("data-sold-total")) out += "{vendidos}";
          else if (n.tagName === "BR") out += "\u0000";
          else if (n.tagName === "EM") out += "*" + walk(n) + "*";
          else if (n.tagName === "STRONG") out += "**" + walk(n) + "**";
          else out += walk(n);
        }
      });
      return out;
    };
    return walk(el).replace(/ *\u0000 */g, "\n").replace(/ {2,}/g, " ").trim();
  }

  // Iconos y rayitas decorativas que no forman parte del texto
  const isDeco = (n) => n.nodeType === 1 && (n.tagName.toLowerCase() === "svg" || (n.tagName === "SPAN" && !n.textContent.trim() && !n.hasAttribute("data-sold-total")));

  function applyText(el, value) {
    const nodes = Array.from(el.childNodes);
    let anchor = null;
    for (const n of nodes) { if (isDeco(n)) anchor = n; else break; }
    nodes.forEach((n) => { if (!isDeco(n)) n.remove(); });
    const tpl = document.createElement("template");
    tpl.innerHTML = formatText(value);
    el.insertBefore(tpl.content, anchor ? anchor.nextSibling : el.firstChild);
  }

  /* Horario por días → líneas tipo "Lunes a jueves · 10:00–13:30 · 17:00–20:00" */
  function hoursFromSchedule(schedule) {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const fmt = (d) => (schedule[d] && schedule[d].length ? schedule[d].map(([a, b]) => `${a}–${b}`).join(" · ") : "Cerrado");
    const groups = [];
    order.forEach((d) => {
      const h = fmt(d), g = groups[groups.length - 1];
      if (g && g.h === h) g.days.push(d); else groups.push({ h, days: [d] });
    });
    return groups.map(({ h, days }) => {
      const a = days[0], b = days[days.length - 1];
      let label;
      if (days.length === 1) label = DAY_NAMES[a];
      else if (days.length === 2) label = `${DAY_PLURAL[a]} y ${DAY_PLURAL[b].toLowerCase()}`;
      else label = `${DAY_NAMES[a]} a ${DAY_NAMES[b].toLowerCase()}`;
      return [label, h];
    });
  }

  /* ---------------------------------------------------------- Firebase */
  const fb = (window.SITE && window.SITE.firebase) || {};
  const configured = !!(fb.apiKey && fb.projectId);
  const FS_BASE = (fb.firestoreBase || "https://firestore.googleapis.com/v1") + `/projects/${fb.projectId}/databases/(default)/documents`;

  // Firestore guarda cada dato con su tipo: aquí se pasa a JS normal y al revés
  function fromValue(v) {
    if (!v) return null;
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("booleanValue" in v) return v.booleanValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("nullValue" in v) return null;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromValue);
    if ("mapValue" in v) return fromFields(v.mapValue.fields || {});
    return null;
  }
  function fromFields(f) { const o = {}; Object.keys(f || {}).forEach((k) => { o[k] = fromValue(f[k]); }); return o; }
  function toValue(x) {
    if (x === null || x === undefined) return { nullValue: null };
    if (typeof x === "boolean") return { booleanValue: x };
    if (typeof x === "number") return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
    if (typeof x === "string") return { stringValue: x };
    if (Array.isArray(x)) return { arrayValue: { values: x.map(toValue) } };
    return { mapValue: { fields: toFields(x) } };
  }
  function toFields(o) { const f = {}; Object.keys(o).forEach((k) => { if (o[k] !== undefined) f[k] = toValue(o[k]); }); return f; }
  const docId = (name) => name.slice(name.lastIndexOf("/") + 1);

  async function fsGet(path, token) {
    const r = await fetch(`${FS_BASE}/${path}${path.includes("?") ? "&" : "?"}key=${fb.apiKey}`, { headers: token ? { Authorization: "Bearer " + token } : {}, cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw Object.assign(new Error("Firestore " + r.status), { status: r.status });
    return r.json();
  }
  async function fsList(col, token) {
    let out = [], page = "";
    do {
      const j = await fsGet(`${col}?pageSize=300${page ? "&pageToken=" + encodeURIComponent(page) : ""}`, token);
      if (!j) break;
      (j.documents || []).forEach((d) => out.push(Object.assign({ id: docId(d.name) }, fromFields(d.fields))));
      page = j.nextPageToken || "";
    } while (page);
    return out;
  }

  /* Fotos guardadas en la base de datos: en las listas van como "fs:ID".
     MZ.setImg(img, ref, "m") pone la foto (versión pequeña "m" o grande). */
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const photoCache = new Map();
  function loadPhoto(id) {
    if (!photoCache.has(id)) {
      photoCache.set(id, fsGet(`fotos/${encodeURIComponent(id)}`).then((d) => (d ? fromFields(d.fields).data : null)).catch(() => null));
    }
    return photoCache.get(id);
  }
  function setImg(img, ref, size) {
    if (!img) return;
    if (!ref || !String(ref).startsWith("fs:")) { img.removeAttribute("data-fs"); img.src = ref || BLANK; return; }
    const id = ref.slice(3) + (size === "m" ? "_m" : "");
    img.dataset.fs = id;
    if (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:image/gif")) img.src = BLANK;
    loadPhoto(id).then((data) => {
      if (img.dataset.fs !== id) return;                    // ya se cambió a otra foto
      if (data) img.src = data;
      else if (size === "m") setImg(img, ref);              // sin miniatura: usa la grande
    });
  }
  // Atributos para <img> escritos como texto (tarjetas, cinta de vendidos…)
  const srcAttr = (ref, size) => (ref && String(ref).startsWith("fs:")
    ? `src="${BLANK}" data-fs-ref="${ref}" data-fs-size="${size || ""}"`
    : `src="${esc(ref || BLANK)}"`);
  function hydrate(root) {
    (root.querySelectorAll ? root : document).querySelectorAll("img[data-fs-ref]").forEach((img) => {
      const ref = img.dataset.fsRef, size = img.dataset.fsSize;
      img.removeAttribute("data-fs-ref"); img.removeAttribute("data-fs-size");
      setImg(img, ref, size);
    });
  }
  new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches && n.matches("img[data-fs-ref]")) hydrate(n.parentNode || document); else hydrate(n); } })))
    .observe(document.documentElement, { childList: true, subtree: true });

  window.MZ = { formatText, toMarkup, applyText, hoursFromSchedule, isDeco, setImg, srcAttr, hydrate, loadPhoto, photoCache,
    fs: { configured, base: FS_BASE, fromFields, toFields, toValue, fsGet, fsList, docId } };

  /* ---------------------------------------------------------------------- */
  let late = false; // si la conexión tarda demasiado, la web ya se pintó con los datos locales
  function applyAll(rows, settings) {
    if (late) return;
    const SITE = window.SITE;
    const toLocal = (r) => ({
      id: r.id, tipo: r.tipo || "coche", marca: r.marca || "", modelo: r.modelo || "", anio: r.anio, km: r.km || 0, cv: r.cv,
      combustible: r.combustible || "", cambio: r.cambio || "", precio: r.precio, garantia: r.garantia || "",
      fotos: r.fotos || [], destacado: !!r.destacado, descripcion: r.descripcion || "", equipamiento: r.equipamiento || ""
    });
    window.VEHICLES = rows.filter((r) => !r.vendido).sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(toLocal);
    window.SOLD = rows.filter((r) => r.vendido)
      .sort((a, b) => String(b.vendido_en || "").localeCompare(String(a.vendido_en || "")))
      .map((r) => ({ id: r.id, nombre: `${r.marca} ${r.modelo || ""}`.trim(), anio: r.anio, km: r.km || 0, foto: (r.fotos || [])[0] }));

    // Datos del negocio
    const n = settings.negocio || {};
    ["phoneDisplay", "email", "address", "addressShort"].forEach((k) => { if (n[k] != null) SITE[k] = n[k]; });
    if (n.phoneDisplay) {
      const digits = n.phoneDisplay.replace(/\D/g, "");
      const full = digits.length === 9 ? "34" + digits : digits;
      SITE.whatsapp = n.whatsapp ? n.whatsapp.replace(/\D/g, "").replace(/^(\d{9})$/, "34$1") : full;
      SITE.phoneHref = "+" + full;
    }
    if (n.schedule) { SITE.schedule = n.schedule; SITE.hours = hoursFromSchedule(n.schedule); }
    if (n.social) SITE.social = Object.assign({}, SITE.social, n.social);
    if (n.soldTotal != null) window.SOLD_TOTAL = n.soldTotal;

    // Textos
    const texts = settings.textos || {};
    document.querySelectorAll("[data-text]").forEach((el) => {
      const v = texts[el.dataset.text];
      if (typeof v === "string" && v.trim()) applyText(el, v);
    });
    // Fotos de la web
    const imgs = settings.imagenes || {};
    document.querySelectorAll("[data-img]").forEach((img) => { if (imgs[img.dataset.img]) setImg(img, imgs[img.dataset.img]); });
  }

  async function load() {
    const [rows, ajustes] = await Promise.all([fsList("vehiculos"), fsList("ajustes")]);
    if (!rows.length) return;                       // base de datos aún vacía: se usan los datos locales
    const settings = {};
    ajustes.forEach((a) => { settings[a.id] = a; });
    applyAll(rows, settings);
  }

  window.DATA_READY = !configured || document.body.classList.contains("is-admin") ? Promise.resolve() : Promise.race([
    load().catch((e) => console.warn("No se pudieron cargar los datos en vivo; uso los locales.", e)),
    new Promise((res) => setTimeout(() => { late = true; res(); }, 6000))
  ]);
})();
