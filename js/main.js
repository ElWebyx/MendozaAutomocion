/* ==========================================================================
   Mendoza Automoción · Comportamiento de la página
   1. Utilidades · 2. Datos de contacto · 3. Cabecera y menú · 4. Stock
   5. Ficha del vehículo · 6. Vende tu coche · 7. Diálogos legales · 8. Animaciones
   ========================================================================== */

(window.DATA_READY || Promise.resolve()).then(function () {
  "use strict";

  const SITE = window.SITE;
  const VEHICLES = window.VEHICLES || [];

  /* 1. Utilidades --------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const euro = (n) => (n == null ? "Consultar precio" : group(n) + "\u00a0€");
  const km = (n) => group(n) + "\u00a0km";
  /* Financiación: cuota = importe × coeficiente del plazo */
  const FIN = () => (SITE.finance && SITE.finance.coef) || {};
  const terms = () => Object.keys(FIN()).map(Number).sort((a, b) => a - b);
  const maxTerm = () => Math.max(...terms());
  const cuota = (importe, meses) => (importe > 0 && FIN()[meses] ? importe * FIN()[meses] : null);
  const euro2 = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "\u00a0€";
  const priceOf = (v) => (v.oferta != null && v.precio != null && v.oferta < v.precio ? v.oferta : v.precio);
  const onSale = (v) => v.oferta != null && v.precio != null && v.oferta < v.precio;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (id) => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* 2. Datos de contacto (desde js/config.js) ----------------------------- */
  $$("[data-wa]").forEach((a) => { a.href = window.waLink(a.dataset.wa); });
  $$("[data-tel]").forEach((a) => { a.href = "tel:" + SITE.phoneHref; });
  $$("[data-phone]").forEach((el) => { el.textContent = SITE.phoneDisplay; });
  $$("[data-email]").forEach((a) => {
    if (!SITE.email) { (a.closest("li") || a).remove(); return; }
    a.href = "mailto:" + SITE.email; const s = $("span", a) || a; s.textContent = SITE.email;
  });
  $$("[data-maps]").forEach((a) => { a.href = SITE.maps[a.dataset.maps]; });
  // El mapa de Google solo se carga en la web real; dentro de una vista previa
  // (la página va metida en otro marco) se muestra la tarjeta con el enlace.
  $$("[data-maps-embed]").forEach((f) => {
    if (window.self === window.top) f.src = SITE.maps.embed; else f.remove();
  });
  $$("[data-sold-total]").forEach((el) => { el.textContent = (el.closest("strong") ? "+" : "") + (window.SOLD_TOTAL || 0); });
  const hoursInline = $("[data-hours-inline]");
  if (hoursInline) hoursInline.innerHTML = SITE.hours.map(([d, h]) => `${esc(d)}: ${esc(h)}`).join("<br>");
  $$("[data-site]").forEach((el) => { el.textContent = SITE[el.dataset.site]; });
  $$("[data-social]").forEach((a) => { a.href = SITE.social[a.dataset.social]; });
  const hoursEl = $("[data-hours]");
  if (hoursEl && SITE.hours) hoursEl.innerHTML = SITE.hours.map(([d, h]) => `<li><span>${esc(d)}</span><span>${esc(h)}</span></li>`).join("");
  $("#year").textContent = new Date().getFullYear();

  // Botón flotante de WhatsApp en móvil
  const float = document.createElement("a");
  float.className = "wa-float";
  float.href = window.waLink("Hola, os escribo desde la web de Mendoza Automoción.");
  float.setAttribute("aria-label", "Escribir por WhatsApp");
  float.innerHTML = icon("wa");
  document.body.appendChild(float);

  /* 3. Cabecera y menú ---------------------------------------------------- */
  const header = $("#cabecera");
  const hero = $("#inicio");
  const menuBtn = $(".menu-btn");
  const menu = $("#menu-movil");
  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;
    const open = menuBtn.getAttribute("aria-expanded") === "true";
    header.classList.toggle("is-solid", y > 60);
    header.classList.toggle("is-hidden", !open && y > 500 && y > lastY + 6);
    if (y < lastY - 6) header.classList.remove("is-hidden");
    float.classList.toggle("is-visible", y > hero.offsetHeight * 0.6);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menu.hidden = !open;
    header.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  // Enlace activo según la sección visible
  const navLinks = $$(".nav a");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) navLinks.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["inicio", "coches", "financiacion", "vendidos", "servicios", "nosotros", "ubicacion"].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* Huecos de fotos: si la foto aún no existe, se muestra "Foto pendiente".
     Para poner la foto basta con guardarla en img/fotos/ con el nombre indicado. */
  $$("[data-slot]").forEach((fig) => {
    const img = $("img", fig);
    const empty = () => { fig.classList.add("is-empty"); img.remove(); };
    if (img.complete && img.naturalWidth === 0) empty(); else img.addEventListener("error", empty);
  });
  $$("[data-slot-bg]").forEach((box) => {
    const img = $("img", box), note = $("[data-slot-note]");
    const empty = () => { box.remove(); };
    const ok = () => { if (note) note.hidden = true; };
    if (img.complete) { img.naturalWidth === 0 ? empty() : ok(); }
    else { img.addEventListener("error", empty); img.addEventListener("load", ok); }
  });

  /* 4. Stock -------------------------------------------------------------- */
  const cardsEl = $("#cards");
  const countEl = $("#stock-count");
  const sortEl = $("#sort");
  const typeBtns = $$(".segmented button");
  let type = "todos";
  let expanded = false;
  const moreBox = $("#more"), moreBtn = $("#more-btn");
  const limit = () => (window.matchMedia("(max-width: 640px)").matches ? 6 : 9);

  // Fotos: lista de direcciones (panel de admin) o, en los datos locales, un número
  const photos = (v) => Array.isArray(v.fotos)
    ? (v.fotos.length ? v.fotos : ["img/og-image.jpg"])
    : Array.from({ length: v.fotos || 1 }, (_, i) => `img/stock/${v.id}-${i}.jpg`);
  const photo = (v, n = 0) => photos(v)[n] || photos(v)[0];
  const title = (v) => `${v.marca} ${v.modelo}`;
  // Las fotos subidas desde el panel se cargan aparte (data.js); el resto son archivos normales
  const srcAttr = (ref, size) => (window.MZ && window.MZ.srcAttr ? window.MZ.srcAttr(ref, size) : `src="${esc(ref)}"`);
  const setImg = (img, ref, size) => (window.MZ && window.MZ.setImg ? window.MZ.setImg(img, ref, size) : (img.src = ref));
  const media = (v, lazy = true, n = 0) =>
    `<img ${srcAttr(photo(v, n), "m")} alt="${esc(title(v))}${n ? ", foto " + (n + 1) : ""}" width="1200" height="900" ${lazy ? 'loading="lazy"' : ""} decoding="async">`;

  const card = (v) => `
    <li class="card${v.reservado ? " card--reserved" : ""}" data-id="${v.id}">
      <div class="card__media">
        ${media(v)}
        <span class="card__badge">${v.tipo === "moto" ? "Moto · " : ""}${esc(v.combustible)}</span>
        ${v.reservado ? `<span class="card__status card__status--res">Reservado</span>` : onSale(v) ? `<span class="card__status card__status--sale">Oferta</span>` : ""}
        <span class="card__warranty">${icon("shield")}Garantía ${esc(v.garantia)}</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${esc(title(v))}</h3>
        <ul class="card__specs" aria-label="Datos principales">
          <li>${icon("cal")}${v.anio}</li>
          <li>${icon("road")}${km(v.km)}</li>
          ${v.cv ? `<li>${icon("bolt")}${v.cv}\u00a0CV</li>` : ""}
        </ul>
        <div class="card__foot">
          <p class="card__price${v.precio == null ? " card__price--ask" : ""}${onSale(v) ? " card__price--sale" : ""}">${onSale(v) ? `<s>${euro(v.precio)}</s>` : ""}${euro(priceOf(v))}${priceOf(v) != null && cuota(priceOf(v), maxTerm()) ? `<small>Desde <b>${group(Math.ceil(cuota(priceOf(v), maxTerm())))}\u00a0€/mes</b></small>` : ""}</p>
          <button class="card__cta" type="button" aria-label="Ver detalles del ${esc(title(v))}">Ver detalles ${icon("arrow")}</button>
        </div>
      </div>
    </li>`;

  function render() {
    const sorters = {
      "destacados": () => 0,
      "recientes": (a, b) => b.anio - a.anio || a.km - b.km,
      "precio-asc": (a, b) => (priceOf(a) ?? 1e9) - (priceOf(b) ?? 1e9),
      "precio-desc": (a, b) => (priceOf(b) ?? 0) - (priceOf(a) ?? 0),
      "ofertas": (a, b) => onSale(b) - onSale(a),
      "km-asc": (a, b) => a.km - b.km
    };
    const all = VEHICLES.filter((v) => type === "todos" || v.tipo === type).slice().sort(sorters[sortEl.value]);
    const list = expanded ? all : all.slice(0, limit());
    moreBox.hidden = expanded || all.length <= list.length;
    moreBtn.innerHTML = `Ver los ${all.length} vehículos ${icon("arrow")}`;
    cardsEl.innerHTML = list.length
      ? list.map(card).join("")
      : `<li class="stock__empty">Ahora mismo no hay ninguno en exposición. Escríbenos y te avisamos en cuanto entre uno.</li>`;
    countEl.textContent = all.length === 1 ? "1 vehículo disponible" : `${all.length} vehículos disponibles`;
    $$(".card", cardsEl).forEach((c, i) => { c.style.setProperty("--delay", `${(i % 3) * 90}ms`); reveal.observe(c); });
  }

  typeBtns.forEach((b) => b.addEventListener("click", () => {
    type = b.dataset.type;
    typeBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  sortEl.addEventListener("change", render);
  moreBtn.addEventListener("click", () => { expanded = true; render(); });

  /* 5. Ficha del vehículo ------------------------------------------------- */
  const dialog = $("#vehicle-dialog");
  let lastTrigger = null;

  /* Galería: flechas, contador, deslizar con el dedo y visor ampliado */
  let gal = { v: null, i: 0, n: 1 };
  function galleryShow(i, dir = 0) {
    const { v, n } = gal; if (!v) return;
    gal.i = (i + n) % n;
    const main = $(".gallery__main", dialog);
    const img = $("img", main);
    setImg(img, photo(v, gal.i));
    img.alt = title(v) + (gal.i ? ", foto " + (gal.i + 1) : "");
    img.style.animation = "none"; void img.offsetWidth;
    img.style.animation = dir ? `${dir > 0 ? "slide-l" : "slide-r"} .35s ease` : "";
    const c = $(".gallery__count", main); if (c) c.textContent = `${gal.i + 1} / ${n}`;
    $$(".gallery__thumb", dialog).forEach((t, k) => {
      t.setAttribute("aria-pressed", String(k === gal.i));
      if (k === gal.i) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    if (lb.open) lbShow();
  }
  function swipe(el, onLeft, onRight, guard) {
    let x0 = null, y0 = 0;
    el.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
    el.addEventListener("pointerup", (e) => {
      if (x0 == null || (guard && guard())) { x0 = null; return; }
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
    });
  }

  function openVehicle(id, trigger) {
    const v = VEHICLES.find((x) => String(x.id) === String(id));
    if (!v) return;
    lastTrigger = trigger;
    const n = photos(v).length;
    gal = { v, i: 0, n };
    const nav = n > 1 ? `
          <button type="button" class="gallery__nav gallery__nav--prev" aria-label="Foto anterior">${icon("chev-l")}</button>
          <button type="button" class="gallery__nav gallery__nav--next" aria-label="Foto siguiente">${icon("chev-r")}</button>
          <span class="gallery__count" aria-live="polite">1 / ${n}</span>` : "";
    $("#vd-media").innerHTML = `
      <div class="gallery">
        <div class="gallery__main">
          <img ${srcAttr(photo(v, 0))} alt="${esc(title(v))}" width="1200" height="900" decoding="async">
          ${nav}
          <button type="button" class="gallery__zoom" aria-label="Ampliar foto">${icon("expand")}</button>
        </div>
        ${n > 1 ? `<div class="gallery__thumbs">${Array.from({ length: n }, (_, i) =>
          `<button type="button" class="gallery__thumb" aria-label="Ver foto ${i + 1}" aria-pressed="${i === 0}" data-n="${i}">${media(v, true, i)}</button>`).join("")}</div>` : ""}
      </div>`;
    const main = $(".gallery__main", dialog);
    $$(".gallery__thumb", dialog).forEach((t) => t.addEventListener("click", () => galleryShow(Number(t.dataset.n), Number(t.dataset.n) > gal.i ? 1 : -1)));
    main.addEventListener("click", (e) => {
      if (e.target.closest(".gallery__nav--prev")) galleryShow(gal.i - 1, -1);
      else if (e.target.closest(".gallery__nav--next")) galleryShow(gal.i + 1, 1);
      else if (e.target.closest(".gallery__zoom") || e.target.tagName === "IMG") lbOpen();
    });
    if (n > 1) swipe(main, () => galleryShow(gal.i + 1, 1), () => galleryShow(gal.i - 1, -1));
    $("#vd-title").textContent = title(v);
    $("#vd-version").textContent = `${v.tipo === "moto" ? "Moto" : "Coche"} · ${v.combustible}${v.garantia ? " · Garantía " + v.garantia : ""}`;
    $("#vd-price").innerHTML = (onSale(v) ? `<s>${euro(v.precio)}</s> <span class="vd__sale">${euro(v.oferta)}</span>` : euro(v.precio)) + (v.reservado ? ` <span class="vd__res">Reservado</span>` : "");
    finMini(priceOf(v));
    const specs = [["Año", v.anio], ["Kilómetros", km(v.km)], ["Potencia", v.cv ? v.cv + "\u00a0CV" : "Consultar"], ["Combustible", v.combustible], ["Cambio", v.cambio], ["Garantía", v.garantia], ["Ubicación", "Las Palmas"]].filter(([, val]) => val != null && val !== "");
    $("#vd-specs").innerHTML = specs.map(([k, val]) => `<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join("");
    const equip = (v.equipamiento || "").split("\n").map((x) => x.trim()).filter(Boolean);
    $("#vd-equip").innerHTML = (equip.length ? equip : ["Garantía incluida", "Financiación a tu medida", "Entregas en islas y península", "Te asesoramos sin compromiso"]).map((e) => `<li>${esc(e)}</li>`).join("");
    const desc = $("#vd-desc"); if (desc) { desc.textContent = v.descripcion || ""; desc.hidden = !v.descripcion; }
    $("#vd-wa").href = window.waLink(`Hola, me interesa el ${title(v)} (${v.anio}, ${km(v.km)})${priceOf(v) != null ? " por " + euro(priceOf(v)) : ""}. ¿Sigue disponible?`);
    dialog.showModal ? dialog.showModal() : dialog.setAttribute("open", "");
  }

  /* Visor a pantalla completa: flechas, teclado, deslizar y zoom */
  const lb = document.createElement("dialog");
  lb.className = "lightbox";
  lb.setAttribute("aria-label", "Foto ampliada");
  lb.innerHTML = `
    <div class="lightbox__stage"><img alt=""></div>
    <button type="button" class="lightbox__btn lightbox__close" aria-label="Cerrar foto ampliada">${icon("x")}</button>
    <button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" aria-label="Foto anterior">${icon("chev-l")}</button>
    <button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" aria-label="Foto siguiente">${icon("chev-r")}</button>
    <div class="lightbox__bar"><span class="lightbox__title"></span><span class="lightbox__count"></span><span class="lightbox__hint">${window.matchMedia("(hover: hover)").matches ? "Haz clic en la foto para hacer zoom" : "Toca la foto para hacer zoom"}</span></div>`;
  document.body.appendChild(lb);
  const lbStage = $(".lightbox__stage", lb), lbImg = $("img", lb);
  let zoomed = false, drag = null;
  function lbZoom(on, x = 50, y = 50) {
    zoomed = on;
    lb.classList.toggle("is-zoomed", on);
    lbImg.style.transformOrigin = `${x}% ${y}%`;
    lbImg.style.transform = on ? "scale(2.4)" : "";
  }
  function lbShow() {
    const { v, i, n } = gal;
    lbZoom(false);
    setImg(lbImg, photo(v, i));
    lbImg.alt = title(v) + ", foto " + (i + 1);
    $(".lightbox__title", lb).textContent = title(v);
    $(".lightbox__count", lb).textContent = `${i + 1} / ${n}`;
    $$(".lightbox__nav", lb).forEach((b) => { b.hidden = n < 2; });
  }
  function lbOpen() { lbShow(); lb.showModal(); }
  const pct = (e) => { const r = lbImg.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]; };
  lb.addEventListener("click", (e) => {
    if (e.target.closest(".lightbox__close")) lb.close();
    else if (e.target.closest(".lightbox__nav--prev")) galleryShow(gal.i - 1, -1);
    else if (e.target.closest(".lightbox__nav--next")) galleryShow(gal.i + 1, 1);
    else if (e.target === lbImg) { if (drag && drag.moved) return; const [x, y] = pct(e); lbZoom(!zoomed, x, y); }
    else if (e.target === lbStage || e.target === lb) lb.close();
  });
  // Con zoom: el ratón mueve la foto; con el dedo se arrastra
  lbImg.addEventListener("pointermove", (e) => {
    if (!zoomed) return;
    if (e.pointerType === "mouse") { const [x, y] = pct(e); lbImg.style.transformOrigin = `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`; }
    else if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      const r = lbImg.getBoundingClientRect();
      const ox = Math.max(0, Math.min(100, drag.ox - (dx / r.width) * 100 * 1.6));
      const oy = Math.max(0, Math.min(100, drag.oy - (dy / r.height) * 100 * 1.6));
      lbImg.style.transformOrigin = `${ox}% ${oy}%`;
    }
  });
  lbImg.addEventListener("pointerdown", (e) => {
    const [ox, oy] = (lbImg.style.transformOrigin || "50% 50%").split(" ").map(parseFloat);
    drag = { x: e.clientX, y: e.clientY, ox, oy, moved: false };
  });
  lbImg.addEventListener("pointerup", () => setTimeout(() => { drag = null; }, 0));
  swipe(lbStage, () => galleryShow(gal.i + 1, 1), () => galleryShow(gal.i - 1, -1), () => zoomed);
  document.addEventListener("keydown", (e) => {
    if (!dialog.open || gal.n < 2) return;
    if (e.key === "ArrowRight") { e.preventDefault(); galleryShow(gal.i + 1, 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); galleryShow(gal.i - 1, -1); }
  });

  cardsEl.addEventListener("click", (e) => {
    const c = e.target.closest(".card");
    if (c) openVehicle(c.dataset.id, $(".card__cta", c));
  });

  $$("dialog").forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === d) d.close(); });
    d.addEventListener("close", () => { if (d === dialog && lastTrigger) lastTrigger.focus(); });
  });

  /* Calculadora en la ficha del coche */
  function finMini(importe) {
    const box = $("#vd-fin"); if (!box) return;
    if (!importe || !terms().length) { box.hidden = true; return; }
    box.hidden = false;
    let sel = maxTerm();
    const draw = () => {
      box.innerHTML = `
        <div class="vfin__head"><span>Financiación</span><strong>${euro2(cuota(importe, sel))}<small>/mes</small></strong></div>
        <div class="vfin__terms" role="group" aria-label="Plazo en meses">${terms().map((t) => `<button type="button" data-t="${t}" aria-pressed="${t === sel}">${t}</button>`).join("")}</div>
        <p class="vfin__note">${sel} meses · cuota orientativa sobre ${euro(importe)} · TIN ${esc(SITE.finance.tin || "")}</p>`;
    };
    draw();
    box.onclick = (e) => { const b = e.target.closest("[data-t]"); if (b) { sel = Number(b.dataset.t); draw(); } };
  }

  /* Calculadora de cuota (sección Financiación) */
  const calc = $("#calc");
  if (calc && terms().length) {
    const amount = $("#calc-amount"), range = $("#calc-range"), termsBox = $("#calc-terms"), out = $("#calc-out"), note = $("#calc-note"), wa = $("#calc-wa");
    let sel = 60;
    if (!FIN()[sel]) sel = terms()[Math.floor(terms().length / 2)];
    termsBox.innerHTML = terms().map((t) => `<button type="button" data-t="${t}">${t}<small>meses</small></button>`).join("");
    const parse = (x) => Number(String(x).replace(/\D/g, "")) || 0;
    function upd(from) {
      let v = from === "range" ? Number(range.value) : parse(amount.value);
      if (from === "range") amount.value = group(v); else range.value = Math.min(Math.max(v, range.min), range.max);
      $$("button", termsBox).forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.t) === sel)));
      const c = cuota(v, sel);
      out.textContent = c ? euro2(c) : "—";
      note.textContent = c ? `${group(v)} € a ${sel} meses · ${sel} cuotas · TIN ${SITE.finance.tin || ""}` : "Escribe el importe que quieres financiar";
      wa.href = window.waLink(c ? `Hola, me gustaría financiar ${group(v)} € a ${sel} meses (cuota aprox. ${euro2(c)}/mes). ¿Me dais más información?` : "Hola, me gustaría información sobre financiación.");
      range.style.setProperty("--p", ((range.value - range.min) / (range.max - range.min)) * 100 + "%");
    }
    termsBox.addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { sel = Number(b.dataset.t); upd(); } });
    range.addEventListener("input", () => upd("range"));
    amount.addEventListener("input", () => upd());
    amount.addEventListener("blur", () => { amount.value = group(parse(amount.value)); });
    upd("range");
  }

  /* 6. Vende tu coche: el mensaje se escribe mientras rellenas ------------ */
  const form = $("#sell-form");
  const preview = $("#sell-preview");
  const errorEl = $("#sell-error");
  const sendBtn = $("#sell-send");

  function sellMessage() {
    const d = Object.fromEntries(new FormData(form));
    const parts = [];
    if (d.modelo.trim()) parts.push(d.modelo.trim());
    if (d.anio) parts.push(`del ${d.anio}`);
    if (d.km.trim()) parts.push(`con ${d.km.trim().replace(/\s*km$/i, "")} km`);
    if (d.combustible) parts.push(d.combustible.toLowerCase());
    if (d.cambio) parts.push(`cambio ${d.cambio.toLowerCase()}`);
    let msg = parts.length ? `Hola, quiero vender mi coche: ${parts.join(", ")}.` : "Hola, quiero vender mi coche.";
    if (d.notas.trim()) msg += ` ${d.notas.trim().replace(/\.?$/, ".")}`;
    return msg + " ¿Me dais una tasación?";
  }
  function update() {
    const msg = sellMessage();
    preview.textContent = msg;
    sendBtn.href = window.waLink(msg);
    if (form.modelo.value.trim()) { errorEl.hidden = true; form.modelo.removeAttribute("aria-invalid"); }
  }
  function valid() {
    if (form.modelo.value.trim()) return true;
    errorEl.hidden = false;
    form.modelo.setAttribute("aria-invalid", "true");
    form.modelo.setAttribute("aria-describedby", "sell-error");
    form.modelo.focus();
    return false;
  }
  form.addEventListener("input", update);
  sendBtn.addEventListener("click", (e) => { if (!valid()) e.preventDefault(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); if (valid()) sendBtn.click(); });
  update();

  /* 7. Diálogos legales --------------------------------------------------- */
  $$("[data-open]").forEach((b) => b.addEventListener("click", () => { const d = document.getElementById(b.dataset.open); if (d) d.showModal(); }));

  /* 8. Animaciones al hacer scroll (al bajar y al volver a subir) ----------
     Cada elemento aparece al entrar en pantalla y se "recoge" al salir, así
     vuelve a animarse cada vez. Si sale por arriba, al volver entra desde arriba. */
  var reveal = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const el = en.target;
      if (en.isIntersecting) {
        el.classList.add("is-in");
      } else {
        el.classList.remove("is-in");
        el.classList.toggle("from-top", en.boundingClientRect.top < 0);
      }
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

  $$("section, footer").forEach((sec) => {
    $$("[data-reveal]", sec).forEach((el, i) => { el.style.setProperty("--delay", `${Math.min(i, 6) * 70}ms`); reveal.observe(el); });
  });

  if (VEHICLES.length) {
    const cars = VEHICLES.filter((v) => v.tipo === "coche").length;
    $("#hero-live").textContent = `${cars} coches y ${VEHICLES.length - cars} motos disponibles ahora en Las Palmas`;
  }

  /* Vendidos: cinta en movimiento (la lista se duplica para que sea infinita) */
  const SOLD = window.SOLD || [];
  const soldCard = (s, hidden) => `
    <li class="sold-card"${hidden ? ' aria-hidden="true"' : ""}>
      <img ${srcAttr(s.foto || `img/vendidos/${s.id}.jpg`, "m")} alt="${hidden ? "" : esc(s.nombre)}" width="900" height="675" loading="lazy">
      <span class="sold-card__stamp">${icon("check")}Vendido</span>
      <div class="sold-card__body">
        <h3 class="sold-card__title">${esc(s.nombre)}</h3>
        <p class="sold-card__meta">${s.anio} · ${km(s.km)}</p>
      </div>
    </li>`
  const half = Math.ceil(SOLD.length / 2);
  const rowA = SOLD.slice(0, half), rowB = SOLD.slice(half).reverse();
  $("#sold-track").innerHTML = rowA.map((s) => soldCard(s)).join("") + rowA.map((s) => soldCard(s, true)).join("");
  $("#sold-track-2").innerHTML = rowB.map((s) => soldCard(s, true)).join("") + rowB.map((s) => soldCard(s, true)).join("");

  /* Efectos ligados al scroll: parallax, hero y barra de progreso */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroMedia = $(".hero__media");
  const heroCopy = $(".hero__content");
  const watermark = $(".hero__watermark");
  const progress = $("#progress");
  const parallax = $$("[data-parallax]");
  let ticking = false;

  function onFrame() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (reduce) return;

    // Hero: la foto baja más despacio, el texto se aleja y la marca de agua se desliza
    const h = hero.offsetHeight;
    if (y < h) {
      const p = y / h;
      heroMedia.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + p * 0.08})`;
      heroCopy.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
      heroCopy.style.opacity = String(Math.max(0, 1 - p * 1.4));
      watermark.style.transform = `translateX(calc(-50% - ${y * 0.4}px))`;
    }
    // Fotos con parallax suave dentro de su marco
    parallax.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(img.dataset.parallax);
      img.style.transform = `translate3d(0, ${offset}px, 0) scale(1.12)`;
    });
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }, { passive: true });
  window.addEventListener("resize", onFrame);
  onFrame();


  /* Contadores: el número de vehículos y los que suben de 0 al verse */
  $$("[data-count-stock]").forEach((el) => { el.textContent = VEHICLES.length; });
  $$("[data-count-stock-anim]").forEach((el) => { el.dataset.countTo = VEHICLES.length; });
  const counters = $$("[data-count-to], [data-count-stock-anim]");
  const runCounter = (el) => {
    const to = Number(el.dataset.countTo); const t0 = performance.now(); const dur = 1400;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting && !reduce) runCounter(en.target); });
  }, { threshold: 0.6 });
  counters.forEach((el) => countObs.observe(el));

  /* Luz que sigue al ratón en tarjetas */
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(".card, [data-spot]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  /* Píldora roja que se desliza en el filtro */
  const pill = $(".segmented__pill");
  function movePill() {
    const on = $(".segmented button[aria-pressed='true']");
    if (!pill || !on) return;
    pill.style.width = on.offsetWidth + "px";
    pill.style.transform = `translateX(${on.offsetLeft - 5}px)`;
  }
  typeBtns.forEach((b) => b.addEventListener("click", () => requestAnimationFrame(movePill)));
  window.addEventListener("resize", movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  movePill();

  /* Abierto ahora / cerrado (hora de Canarias) */
  function openStatus() {
    const box = $("#open-now"); if (!box || !SITE.schedule) return;
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    const now = Number(get("hour")) * 60 + Number(get("minute"));
    const mins = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
    const today = SITE.schedule[day] || [];
    const slot = today.find(([a, b]) => now >= mins(a) && now < mins(b));
    let text;
    if (slot) text = `Abierto ahora · hasta las ${slot[1]}`;
    else {
      const later = today.find(([a]) => now < mins(a));
      if (later) text = `Cerrado ahora · abrimos hoy a las ${later[0]}`;
      else {
        const names = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
        let d = day, guard = 0;
        do { d = (d + 1) % 7; guard++; } while (!SITE.schedule[d] && guard < 8);
        text = `Cerrado ahora · abrimos el ${names[d]} a las ${SITE.schedule[d][0][0]}`;
      }
    }
    box.classList.toggle("is-closed", !slot);
    $("#open-now-text").textContent = text;
  }
  openStatus();
  setInterval(openStatus, 60000);

  /* Línea del proceso que se rellena al bajar */
  const tl = $("#timeline"), tlFill = $("#timeline-fill"), steps = $$(".step");
  const wms = $$("[data-wm]");
  function scrollEffects() {
    const vh = window.innerHeight;
    if (tl) {
      const r = tl.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height + vh * 0.25)));
      const vertical = window.matchMedia("(max-width: 900px)").matches;
      tlFill.style.transform = vertical ? `scaleY(${p})` : `scaleX(${p})`;
      steps.forEach((s, i) => s.classList.toggle("is-active", p >= (i + 0.2) / steps.length || p >= 0.98));
    }
    if (!reduce) wms.forEach((w) => {
      const r = w.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const dir = w.classList.contains("wm--right") ? 1 : -1;
      w.style.transform = `translateX(${dir * (r.top - vh / 2) * 0.15}px)`;
    });
  }
  window.addEventListener("scroll", () => requestAnimationFrame(scrollEffects), { passive: true });
  window.addEventListener("resize", scrollEffects);
  scrollEffects();

  const start = () => hero.classList.add("is-loaded");
  requestAnimationFrame(start);
  setTimeout(start, 120);
  render();
});
