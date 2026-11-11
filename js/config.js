/* ==========================================================================
   Mendoza Automoción · Datos de contacto
   --------------------------------------------------------------------------
   Datos tomados de la ficha de Google Maps y de la web actual
   (mendozaautomocion.com). Si algo cambia, se cambia solo aquí.
   ========================================================================== */

window.SITE = {
  name: "Mendoza Automoción",

  // WhatsApp y teléfono
  whatsapp: "34667830280",
  phoneDisplay: "667 83 02 80",
  phoneHref: "+34667830280",

  email: "",                                   // PENDIENTE: no aparece en Google ni en la web actual

  address: "C. Castillejos, 37, 35010 Las Palmas de Gran Canaria",
  addressShort: "C. Castillejos, 37 · Guanarteme",

  // Horario (Google Maps): [días, horas]
  hours: [
    ["Lunes a jueves", "10:00–13:30 · 17:00–20:00"],
    ["Viernes", "10:00–13:00"],
    ["Sábados y domingos", "Cerrado"]
  ],

  // Horario en formato máquina (0 = domingo … 6 = sábado), hora de Canarias
  schedule: {
    1: [["10:00", "13:30"], ["17:00", "20:00"]],
    2: [["10:00", "13:30"], ["17:00", "20:00"]],
    3: [["10:00", "13:30"], ["17:00", "20:00"]],
    4: [["10:00", "13:30"], ["17:00", "20:00"]],
    5: [["10:00", "13:00"]]
  },

  maps: {
    // Mapa oficial de la ficha de Google (el mismo que usa la web actual)
    embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3518.5660810710133!2d-15.44592552371297!3d28.129250506755675!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xc40958ea0edc5f1%3A0xe127a34386fdb1a3!2sMendoza%20Automoci%C3%B3n!5e0!3m2!1ses!2ses!4v1705842311853!5m2!1ses!2ses",
    directions: "https://www.google.com/maps/dir/?api=1&destination=Mendoza+Automoci%C3%B3n&destination_place_id=ChIJ8cXtoI6VQAwRo7H9hkOjJ-E",
    place: "https://www.google.com/maps/place/?q=place_id:ChIJ8cXtoI6VQAwRo7H9hkOjJ-E"
  },

  social: {
    instagram: "https://www.instagram.com/mendozaautomocion",
    facebook: "https://www.facebook.com/mendozaautomocion"
  },

  // Financiación: coeficientes de la financiera (fila "Vida Plus").
  // Cuota al mes = importe × coeficiente. Se pueden cambiar desde el panel.
  finance: {
    tin: "10,75 %",
    coef: { 24: 0.047888, 36: 0.033691, 48: 0.026881, 60: 0.022925, 72: 0.020208, 84: 0.018404, 96: 0.017095 }
  },

  // Panel de administrador (Firebase). Mira la guía en ADMIN-LEEME.md.
  // Con esto vacío la web funciona igual, con los datos de estos archivos.
  firebase: {
    apiKey: "AIzaSyAZ-NlOjQhrZWMWuXAQc21eE2ch_H4x-kk",   // es pública, no pasa nada porque se vea
    projectId: "mendozaautomocion-b8b08"
  }
};

/* Enlace de WhatsApp con un mensaje ya escrito */
window.waLink = function (message) {
  const base = "https://wa.me/" + window.SITE.whatsapp;
  return message ? base + "?text=" + encodeURIComponent(message) : base;
};
